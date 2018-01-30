class CDR {
    constructor(session) {
        this.session = session;
        this.totCall = 0;
        this.filter = null;
        this.page = 1;
        this.count = 0;
        this.groups = [];
    }

    next(cb) {
        return this.list(++this.page, this.filter, cb);
    }

    find(qs = '*', cb, hard) {
        if (!hard && qs === this.filter)
            return cb(null, this.groups, this.totCall, this.count);

        this.page = 1;
        this.filter = qs;
        this.groups = [];
        this.count = 0;
        return this.list(this.page, this.filter, cb);
    }

    byUuid(call_uuid, cb) {
        let body = {};
        body.columns = {};
        body.fields = {};

        body.filter = {"variables.uuid": call_uuid};
        body.sort = {};
        body.limit = 1;

        body = JSON.stringify(body);

        this.session.cdrRequest("POST", "/api/v2/cdr/searches/", body, cb);
    }

    list(page, qs, cb) {
        const body = {
            "columns": [
                "CallerID number",
                "variables.effective_caller_id_name", //TODO

                "Destination number",
                "variables.duration",
                "variables.webitel_direction",
                "variables.hangup_cause",
                "variables.uuid",
                "variables.cc_queue",
                "post_data.comment",
                "post_data.vote"
                // "variables.billsec",
                // "hold_accum_seconds"
            ],
            "includes": ["recordings"],
            "columnsDate": ["Call start time", "Call answer time", "Bridge time", "Call end time"],
            "pageNumber": page,
            "limit": 40,
            "query": qs,
            // "domain": "10.10.10.144", //TODO DODO
            "filter": {
                "range": {
                    "variables.start_stamp": {
                        "gte" : "now-7d/d",
                        "lt" :  "now",
                        "format": "epoch_millis"
                    }
                }
            },
            "sort": {
                "Call start time": {
                    "order": "desc",
                    "missing": "_last"
                }
            }
        };

        this.session.cdrRequest('POST', '/api/v2/cdr/text', JSON.stringify(body), (e, res) => {
            if (e)
                return cb(e);

            return this._setCacheData(parseElasticResponse(this.session, res.hits.hits), res.hits.total, cb);
        });
    }

    _setCacheData(items, total, cb) {
        if (items.length === 0)
            return cb(null, this.groups, total, false);

        let lastGroup = getLastElem(this.groups);
        let by;

        items.forEach( item => {
            this.count++;
            by = new Date(item[['Call start time']]);
            if (!lastGroup) {
                lastGroup = makeGroup(by.toLocaleDateString());
                this.groups.push(lastGroup)
            } else if (lastGroup.by !== by.toLocaleDateString()) {
                lastGroup = makeGroup(by.toLocaleDateString());
                this.groups.push(lastGroup);
            }

            item.startTime = by.toTimeString().split(' ')[0];
            item.durationString = intToTimeString(item['variables.duration']);
            item.imgClassName = getImgCall(item['variables.webitel_direction'], item['variables.hangup_cause'], !!item['variables.cc_queue']);

            lastGroup.items.push(item)
        });
        this.totCall = total;
        return cb(null, this.groups, total, this.count)
    }
}

function makeGroup(by) {
    return {
        by,
        name: getGroupName(by),
        show: true,
        items: []
    }
}

function intToTimeString(seconds) {
    let h, m, s, str = '';
    s = Math.floor(seconds);
    m = Math.floor(s / 60);
    s = s % 60;
    h = Math.floor(m / 60);
    m = m % 60;

    if (h > 0) {
        str += `${h} hours `
    }

    if (m > 0) {
        str += `${m} min `
    }

    str += `${s} sec`;
    return str;
}

function getImgCall(direction, hangupCause, isQueue) {
    if (isQueue) {
        return 'inbound-queue-call-img'
    } else if (direction === 'internal') {
        return 'internal-call-img'
    } else if (direction === 'conference') {
        return 'conference-call-img'
    } else if (direction === 'outbound' && hangupCause === 'NORMAL_CLEARING') {
        return 'outbound-ok-call-img'
    } else if (direction === 'outbound') {
        return 'outbound-error-call-img'
    } else if (direction === 'inbound' && hangupCause === 'NORMAL_CLEARING') {
        return 'inbound-ok-call-img'
    } else if (direction === 'inbound' && hangupCause === 'ORIGINATOR_CANCEL') {
        return 'missed-call-img'
    } else if (direction === 'inbound' ) {
        return 'inbound-error-call-img'
    } else {
        return 'unknown-call-img'
    }
}

function getGroupName(by) {
    if (by === new Date().toLocaleDateString()) {
        return 'Today'
    } else {
        return by
    }
}

function getLastElem(arr) {
    return arr[arr.length - 1];
}

function parseElasticResponse(session, res) {
    const data = [];
    let t = {};
    res.forEach(function (item) {
        t = {};

        for (let key in item.fields) {
            t[key] = item.fields[key][0];
        }

        if (item._source && item._source.recordings) {
            t.recordings = item._source.recordings;
            t.recordings.forEach(rec => {
                rec._uri = session.getCdrFileUri(rec.uuid, rec.name, rec.createdOn, _getTypeFile(rec['content-type']))
            })
        }
        data.push(t);
    });
    return data;
}

function _getTypeFile(contentType) {

    switch (contentType) {
        case 'application/pdf':
            return 'pdf';
        case 'audio/wav':
            return 'wav';
        case 'audio/mpeg':
        default:
            return 'mp3'

    }
}
