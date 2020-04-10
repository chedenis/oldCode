'use strict';

var ResidentController = function (scope) {
    if (typeof scope === 'undefined') { scope = {}; } // eslint-disable-line

    var superagent = require('superagent');
    var residentBaseUrl = scope.residentBaseUrl || "http://localhost:8012"


    var createResidentFromSql = function (authToken, SQLresident) {
        return new Promise(function (resolve, reject) {
            var insurance;
            if (SQLresident.InsName && SQLresident.InsName != 'null') {
                var insurance = {};
                insurance.name = SQLresident.InsName;
                insurance.info = SQLresident.InsNumber;
            }
            var guarantor;

            if (SQLresident.guarFirstName && SQLresident.guarFirstName != 'null') {
                guarantor = {
                    "name": {
                        "first": SQLresident.guarFirstName,
                        "last": SQLresident.guarLastName,
                    },
                    "address": {
                        "line1": SQLresident.guarAddressLineOne,
                        "line2": SQLresident.guarAddressLineTwo,
                        "city": SQLresident.guarCity,
                        "county": SQLresident.guarCounty,
                        "state": SQLresident.guarState,
                    },
                    'type': 'Financial',
                    "contactInfo": [],

                    gender: SQLresident.guarGender,
                    socialSecurityNumber: SQLresident.guarSocialSecurityNumber,
                    source: 'nextgen'
                }

                if (!guarantor.gender || guarantor.gender == 'null' || guarantor.gender === ' ') {
                    guarantor.gender = 'U'
                }

                if (SQLresident.guarZip && SQLresident.guarZip.length > 5) {
                    guarantor.address.zip = SQLresident.guarZip.substring(0, 5);
                    guarantor.address.zipPlus = SQLresident.guarZip.slice(5);
                } else {
                    guarantor.address.zip = SQLresident.guarZip;
                }

                if (SQLresident.guarHomePhone && SQLresident.guarHomePhone != 'null') {
                    var info = {
                        "type": "Home Phone",
                        "value": SQLresident.guarHomePhone
                    }
                    guarantor.contactInfo.push(info);
                }

                if (SQLresident.guarDayPhone && SQLresident.guarDayPhone != 'null') {
                    var info = {
                        "type": "Home Phone",
                        "value": SQLresident.guarDayPhone
                    }
                    guarantor.contactInfo.push(info);
                }

                if (SQLresident.guarAltPhone && SQLresident.guarAltPhone != 'null') {
                    var info = {
                        "type": "Home Phone",
                        "value": SQLresident.guarAltPhone
                    }
                    guarantor.contactInfo.push(info);
                }

                if (SQLresident.guarCellPhone && SQLresident.guarCellPhone != 'null') {
                    var info = {
                        "type": "Cell Phone",
                        "value": SQLresident.guarCellPhone
                    }
                    guarantor.contactInfo.push(info);
                }

                if (guarantor.address.state && guarantor.address.state != 'null') {
                    guarantor.address.state = guarantor.address.state.trim();
                }


            }
            var resident = {
                "name": {
                    "first": SQLresident.firstName,
                    "last": SQLresident.lastName
                },
                "socialSecurityNumber": SQLresident.socialSecurityNumber,
                "gender": SQLresident.gender,
                "ehr": {
                    "nextgen": {
                        "personId": SQLresident.nextgenPersonId
                    }
                },
                "ethnicity": SQLresident.ethnicity,
                "race": SQLresident.race,
                "powerOfAttorneys": [],
                "insuranceInfo": [],
                "facility": {
                    "locationName": SQLresident.nextgenLocationName
                },
                source: 'nextgen',
                updateNextgen: true
            }

            if (!resident.gender || resident.gender == 'null' || resident.gender === ' ') {
                guarantor.gender = 'U'
            }

            if (!resident.socialSecurityNumber || resident.socialSecurityNumber == 'null') {
                resident.socialSecurityNumber = "000000000";
            }

            if (SQLresident.birthDate && SQLresident.birthDate.length === 8) {
                var year = SQLresident.birthDate.substring(0, 4);
                var month = parseInt(SQLresident.birthDate.substring(4, 6)) - 1;
                var day = SQLresident.birthDate.substring(6, 8);
                resident.birthDate = new Date(year, month, day, 8, 8, 8)
            }

            if (SQLresident.isDeceased === "Y") {
                resident.isDeceased = true;
            } else {
                resident.isDeceased = false;
            }

            if (SQLresident.dischargeStatus) {
                SQLresident.dischargeStatus = SQLresident.dischargeStatus.trim();

                if (SQLresident.dischargeStatus === "Discharged From Facility" || SQLresident.dischargeStatus === "Discharged From Facility") {
                    resident.isDischarged = true;
                } else {
                    resident.isDischarged = false;
                }
            } else {
                resident.isDischarged = false;
            }

            if (!resident.ethnicity || resident.ethnicity == 'null') {
                resident.ethnicity = 'Unknown / Not Reported';
            }
            if (guarantor) {
                resident.powerOfAttorneys.push(guarantor)
            }

            if (insurance) {
                resident.insuranceInfo.push(insurance);
            }

            if (SQLresident.personCreatedTimeStamp && SQLresident.personCreatedTimeStamp != 'null') {
                if (SQLresident.personCreatedTimeStamp.$date) {
                    resident.createdTimeStamp = new Date(SQLresident.personCreatedTimeStamp.$date);
                } else {
                    resident.createdTimeStamp = new Date(SQLresident.personCreatedTimeStamp);
                }
            }

            console.log("created resident " + JSON.stringify(resident));

            superagent
                .post(`${residentBaseUrl}/create`)
                .send(resident)
                .set('Authorization', `Bearer ${authToken}`)
                .set('Content-type', 'application/json; charset=utf-8')
                .end((err, res) => {
                    if (err || !res.ok) {
                        // Log the error but allow the response to be the same, since we don't want to retry full resident creates just because the guarantor request failed.
                        console.error(err);
                        return reject(err);
                        // TODO: Output this to a collection so we can reprocess failed guarantors later.
                    } else {
                        //console.log(res.body);
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