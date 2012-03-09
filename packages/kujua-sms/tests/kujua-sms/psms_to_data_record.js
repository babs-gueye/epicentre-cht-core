var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    logger = require('kujua-utils').logger,
    baseURL = require('duality/core').getBaseURL(),
    appdb = require('duality/core').getDBURL(),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');


var example = {
    sms_message: {
       from: "+13125551212",
       message: '1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4',
       sent_timestamp: "1-19-12 18:45",
       sent_to: "+15551212",
       type: "sms_message",
       locale: "en",
       form: "PSMS"
    },
    clinic: {
        "_id": "4a6399c98ff78ac7da33b639ed60f458",
        "_rev": "1-0b8990a46b81aa4c5d08c4518add3786",
        "type": "clinic",
        "name": "Example clinic 1",
        "contact": {
            "name": "Sam Jones",
            "phone": "+13125551212"
        },
        "parent": {
            "type": "health_center",
            "contact": {
                "name": "Neal Young",
                "phone": "+17085551212"
            },
            "parent": {
                "type": "district_hospital",
                "contact": {
                    "name": "Bernie Mac",
                    "phone": "+14155551212"
                }
            }
        }
    },
    form_data: {
        days_stocked_out: {
            cotrimoxazole: [7, "Cotrimoxazole: Days stocked out"],
            eye_ointment: [4, "Eye Ointment: Days stocked out"],
            la_6x1: [9, "LA 6x1: Days stocked out"],
            la_6x2: [8, "LA 6x2: Days stocked out"],
            ors: [5, "ORS: Days stocked out"],
            zinc: [6, "Zinc: Days stocked out"]
        },
        facility_id: ['facility', 'Health Facility Identifier'],
        month: ['11', 'Report Month'],
        quantity_dispensed: {
            cotrimoxazole: [3, "Cotrimoxazole: Dispensed total"],
            eye_ointment: [6, "Eye Ointment: Dispensed total"],
            la_6x1: [1, "LA 6x1: Dispensed total"],
            la_6x2: [2, "LA 6x2: Dispensed total"],
            ors: [5, "ORS: Dispensed total"],
            zinc: [4, "Zinc: Dispensed total"]
        },
        year: ['2011', 'Report Year']
    },
    days_stocked_out: {
        cotrimoxazole: 7,
        eye_ointment: 4,
        la_6x1: 9,
        la_6x2: 8,
        ors: 5,
        zinc: 6
    },
    quantity_dispensed: {
        cotrimoxazole: 3,
        eye_ointment: 6,
        la_6x1: 1,
        la_6x2: 2,
        ors: 5,
        zinc: 4
    }
};

var expected_callback = {
    data: {
        type: "data_record_psi_malawi",
        form: "PSMS",
        form_data: example.form_data,
        related_entities: {
            clinic: null
        },
        sms_message: example.sms_message,
        from: "+13125551212",
        errors: [],
        tasks: [],
        days_stocked_out: example.days_stocked_out,
        quantity_dispensed: example.quantity_dispensed,
        facility_id:"facility",
        month: '11',
        year: '2011'
    }
};


/*
 * STEP 1:
 *
 * Run add_sms and expect a callback to add a clinic to a data record which
 * contains all the information from the SMS.
 **/
exports.psms_to_record = function (test) {

    test.expect(25);

    // Data parsed from a gateway POST
    var data = {
        from: '+13125551212',
        message: '1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212'
    };

    // request object generated by duality includes uuid and query.form from
    // rewriter.
    var req = {
        uuid: '14dc3a5aa6',
        query: {form: 'PSMS'},
        method: "POST",
        headers: helpers.headers("url", querystring.stringify(data)),
        body: querystring.stringify(data),
        form: data
    };

    var resp = fakerequest.update(updates.add_sms, data, req);

    var resp_body = JSON.parse(resp[1].body);
    delete resp_body.callback.data.reported_date;
    
    test.same(
        resp_body.callback.options.path,
        baseURL + "/PSMS/data_record/add/clinic/%2B13125551212");

    test.same(
        resp_body.callback.data.days_stocked_out,
        expected_callback.data.days_stocked_out);

    test.same(
        resp_body.callback.data.quantity_dispensed,
        expected_callback.data.quantity_dispensed);

    test.same(
        resp_body.callback.data.form_data,
        expected_callback.data.form_data);

    test.same(
        resp_body.callback.data.sms_message,
        expected_callback.data.sms_message);

    test.same(
        resp_body.callback.data,
        expected_callback.data);

    // form next request from callback data
    var next_req = {
        method: resp_body.callback.options.method,
        body: JSON.stringify(resp_body.callback.data),
        path: resp_body.callback.options.path,
        headers: helpers.headers(
                    'json', JSON.stringify(resp_body.callback.data)),
        query: {form: 'PSMS'} // query.form gets set by rewriter
    };

    step2(test, next_req);

};

//
// STEP 2:
//
// Run data_record/add/clinic and expect a callback to
// check if the same data record already exists.
//
var step2 = function(test, req) {

    var clinic = example.clinic;

    var viewdata = {rows: [
        {
            "key": ["+13125551212"],
            "value": clinic
        }
    ]};

    var resp = fakerequest.list(lists.data_record, viewdata, req);

    var resp_body = JSON.parse(resp.body);

    test.same(
        resp_body.callback.options.path,
        baseURL + "/PSMS/data_record/merge/2011/11/" + clinic._id);

    test.same(
        resp_body.callback.data.related_entities,
        {clinic: clinic});

    test.same(resp_body.callback.data.errors, []);

    // form next request from callback data
    var next_req = {
        method: resp_body.callback.options.method,
        body: JSON.stringify(resp_body.callback.data),
        path: resp_body.callback.options.path,
        headers: helpers.headers(
                    'json', JSON.stringify(resp_body.callback.data)),
        query: {form: 'PSMS'} // query.form gets set by rewriter
    };

    step3_1(test, next_req);
    step3_2(test, next_req);

};


/**
 * STEP 3, CASE 1: A data record already exists.
 *
 * Run data_record/merge/year/month/clinic_id and expect a callback to update
 * the data record with the new data.
 *
 * @param {Object} test - Unittest object
 * @param {Object} callback - Callback object used to form the next request
 * @api private
 */
var step3_1 = function(test, req) {

    var viewdata = {rows: [
        {
            key: ["2011", "11", "4a6399c98ff78ac7da33b639ed60f458"],
            value: {
                _id: "777399c98ff78ac7da33b639ed60f422",
                _rev: "484399c98ff78ac7da33b639ed60f923"
            }
        }
    ]};

    var resp = fakerequest.list(lists.data_record_merge, viewdata, req);
    var resp_body = JSON.parse(resp.body);

    // main tests
    test.same(
        resp_body.callback.data._rev,
        "484399c98ff78ac7da33b639ed60f923");

    test.same(
        resp_body.callback.options.path,
        appdb + "/777399c98ff78ac7da33b639ed60f422");

    test.same(
        resp_body.callback.options.method,
        "PUT");

    // extra checks
    test.same(
        resp_body.callback.data.quantity_dispensed,
        expected_callback.data.quantity_dispensed);

    test.same(
        resp_body.callback.data.form_data,
        expected_callback.data.form_data);

    test.same(
        resp_body.callback.data.sms_message,
        expected_callback.data.sms_message);

    test.same(
        resp_body.callback.data.related_entities,
        {clinic: example.clinic});

    test.same(resp_body.callback.data.errors, []);
    test.same(resp_body.callback.data.tasks, []);

    // request callback chain end, data record is updated
    // form next request from callback data
};


/**
 * STEP 3, CASE 2:
 *
 * A data record does not exist.
 *
 * Run data_record/merge/year/month/clinic_id and expect a callback to create a
 * new data record.
 */
var step3_2 = function(test, req) {

    var viewdata = {rows: []};

    var resp = fakerequest.list(lists.data_record_merge, viewdata, req);

    var resp_body = JSON.parse(resp.body);

    // If no record exists during the merge then we create a new record with
    // POST
    test.same(resp_body.callback.options.method, "POST");
    test.same(resp_body.callback.options.path, appdb);

    // extra checks
    test.same(resp_body.callback.data.errors, []);
    test.same(
        resp_body.callback.data.form_data,
        example.form_data);
    test.same(
        resp_body.callback.data.sms_message,
        example.sms_message);
    test.same(
        resp_body.callback.data.days_stocked_out,
        example.days_stocked_out);
    test.same(
        resp_body.callback.data.quantity_dispensed,
        example.quantity_dispensed);

    test.done()
};
