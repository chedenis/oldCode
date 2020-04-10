'use strict';

var ResidentController = function (scope) {
    if (typeof scope === 'undefined') { scope = {}; } // eslint-disable-line

    var superagent = require('superagent');
    var residentBaseUrl = scope.residentBaseUrl || "http://localhost:8012"

    var createResidentFromSql = function (authToken, SQLresident) {
        return new Promise(function (resolve, reject) {
            var guarantor;
            if (SQLresident.GUARFIRSTNAME && SQLresident.GUARFIRSTNAME != 'null') {
                //no county
                guarantor = {
                    "name": {
                        "first": SQLresident.GUARFIRSTNAME,  //Got for greenway
                        "last": SQLresident.GUARLASTNAME, //
                    },
                    "address": {
                        "line1": SQLresident.GUARADDRESSLINEONE,
                        "city": SQLresident.GUARCITY,
                        "state": SQLresident.GUARSTATE,
                    },
                    'type': 'Financial',
                    "contactInfo": [],

                    gender: SQLresident.GUARGENDER,
                    socialSecurityNumber: SQLresident.GUARSOCIALSECURITYNUMBER,
                    source: 'greenway'
                }

                if (SQLresident.GUARADDRESSLINETWO && SQLresident.GUARADDRESSLINETWO !== 'null') {
                    guarantor.address.line2 = SQLresident.GUARADDRESSLINETWO;
                }

                if (!guarantor.gender || guarantor.gender == 'null' || guarantor.gender === ' ') {
                    guarantor.gender = 'U'
                }

                if (SQLresident.GUARZIP) {
                    SQLresident.GUARZIP = SQLresident.GUARZIP.trim();
                    if (SQLresident.GUARZIP.length > 5) {
                        guarantor.address.zip = SQLresident.GUARZIP.substring(0, 5);
                        guarantor.address.zipPlus = SQLresident.GUARZIP.slice(5);
                    } else {
                        guarantor.address.zip = SQLresident.GUARZIP;
                    }
                }

                if (SQLresident.GUARHOMEPHONE && SQLresident.GUARHOMEPHONE != 'null') {
                    var info = {
                        "type": "Home Phone",
                        "value": SQLresident.GUARHOMEPHONE
                    }
                    guarantor.contactInfo.push(info);
                }

                if (guarantor.address.state && guarantor.address.state != 'null') {
                    guarantor.address.state = guarantor.address.state.trim();
                }


            }

            //TODO REMOVE FOR TESTING

            //SQLresident.EMPLOYERNAME = "chestest";

            var resident = {
                "name": {
                    "first": SQLresident.FIRSTNAME,//
                    "last": SQLresident.LASTNAME//
                },
                "socialSecurityNumber": SQLresident.SOCIALSECURITYNUMBER,//
                "gender": SQLresident.GENDER,
                "ehr": {
                    "greenway": {
                        "patientId": SQLresident.GREENWAYID,
                        "employerName": SQLresident.EMPLOYERNAME
                    }
                },
                "ethnicity": SQLresident.ETHNICITY,
                "powerOfAttorneys": [],
                "birthDate": SQLresident.BIRTHDATE,
                source: 'greenway'
            }

            if (!resident.socialSecurityNumber || resident.socialSecurityNumber == 'null') {
                resident.socialSecurityNumber = "000000000";
            }
    
            if (SQLresident.STATUSNAME === "DECEASED") {
                resident.isDeceased = true;
            } else if (SQLresident.STATUSNAME === "DISCHARGED PATIENT"){
                resident.isDischarged = true;
            }
            
            if (!resident.ethnicity || resident.ethnicity == 'null' || resident.ethnicity === ' ') {
                resident.ethnicity = 'Unknown / Not Reported';
            }
            if (guarantor) {
                resident.powerOfAttorneys.push(guarantor)
            }

            console.log("Resident Here");
            console.log(JSON.stringify(resident));

            superagent
                .post(`${residentBaseUrl}/create`)
                .send(resident)
                .set('Authorization', `Bearer ${authToken}`)
                .set('Content-type', 'application/json; charset=utf-8')
                .end((err, res) => {
                    if (err || !res.ok) {
                        // Log the error but allow the response to be the same, since we don't want to retry full resident creates just because the guarantor request failed.
                        console.log("noooo error");
                        console.error(err);
                        return reject(err);
                        // TODO: Output this to a collection so we can reprocess failed guarantors later.
                    } else {
                        //console.log(res.body);
                        console.log("yesss success")
                        return resolve(res.body);
                    }
                });
        })
    }

    // scrubbedJson.replace(/{ ([a-zA-Z]+): /g, "{ \"$1\": ").replace(/,\s+([a-zA-Z]+): /g, ", \"$1\": ").replace(/: \'/g, ': "').replace(/\',/g, '",').replace(/\' }/g, '" }').replace(/\"birthDate\": ([^,]+)/, "\"birthDate\": \"$1\"").replace(/\"createdTimeStamp\": ([^,]+)/, "\"createdTimeStamp\": \"$1\"").replace(/\"updatedTimeStamp\": ([^,]+)/, "\"updatedTimeStamp\": \"$1\"").replace(/\n/g, '').replace(/:\s+{/g, ': {');

    return {
        createResidentFromSql: createResidentFromSql
    };
};

module.exports = ResidentController;
