console.log("ENV " + process.env.NODE_ENV);

/////////////////////Start Declaring Variables////////////////////

var MongoClient = require('mongodb').MongoClient;
var sql = require('mssql');
var async = require("async");
var superagent = require('superagent');
var startDate = false;
var endDate = false;
var consolePersonId = false;
var config;
var sql01env;
var consoleEmployerName = false;

if (process.env.NODE_ENV === "production") {
    config = require('../config/production.json')
    sql01env = "NGProd";
} else if (process.env.NODE_ENV === "qa") {
    config = require('../config/qa.json')
    sql01env = "NGTEST";
} else if (process.env.NODE_ENV === "development") {
    config = require('../config/default.json');
    sql01env = "NGTEST";
} else {
    throw new Error("No env provided");
    process.exit(1);
}

var authSeviceBaseURL = config.authSeviceBaseURL;
var residentBaseUrl = config.residentBaseUrl;
var login = config.fredsLogin;
var sql01Options = config.sql01Options;
var ResidentController = require('../controllers/resident')({
    "residentBaseUrl": residentBaseUrl
});

process.argv.forEach(function (arg) {
    console.log(arg);
    if (arg.indexOf('startdate=') !== -1) {
        console.log(arg.substring(10));
        startDate = arg.substring(10);
    }

    if (arg.indexOf('enddate=') !== -1) {
        console.log(arg.substring(8));
        endDate = arg.substring(8);
    }

    if (arg.indexOf('personId=') !== -1) {
        console.log(arg.substring(9));
        consolePersonId = arg.substring(9);
        console.log("PersonId = " + consolePersonId);
    }

    if (arg.indexOf('employerName=') !== -1) {
        console.log(arg.substring(13));
        consoleEmployerName = arg.substring(13);
        console.log("employerName = " + consoleEmployerName);
    }


});

/////////////////////End Declaring Variables////////////////////

///////////////////Start Declaring SQL Functions/////////////////////
sql.connect(sql01Options, err => {

    //This function updates the external_xref with a changed entity key
    var updateEntityKey = function (entityKey, personId) {
        return new Promise(function (resolve, reject) {
            // ... error checks 
            const request = new sql.Request();
            request.stream = true; // You can set streaming differently for each request

            var query = "update SQL01." + sql01env + ".dbo.person_external_xref Set external_id = '"
                + entityKey + "' where person_id = '" + personId + "'";

            console.log(query);
            console.log("entityKey " + entityKey + " personId " + personId);

            request.query(query);

            var rows = [];
            request.on('row', function (row) {
                rows.push(row);
            });
            request.on('error', function (err) {
                console.log("we errored in sql update request");
                return reject(err);
            });
            request.on('done', function () {
                console.log("we done with sql update request");
                return resolve(rows);
            });
        })
    }

    //This function inserts a record in the external_xref table
    var insertEntityKey = function (entityKey, personId) {
        console.log("trying to insert");
        return new Promise(function (resolve, reject) {
            // ... error checks 
            const request = new sql.Request()
            request.stream = true // You can set streaming differently for each request

            var query = "INSERT INTO SQL01." + sql01env + ".dbo.person_external_xref \
                (person_id, external_id, external_system_id, create_timestamp, modify_timestamp, created_by, modified_by) \
                VALUES ('" + personId + "', '" + entityKey + "', '160400', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0);";

            request.query(query);

            var rows = [];
            console.log(query);
            console.log("entityKey " + entityKey + " personId " + personId);
            request.on('row', function (row) {
                console.log(row);
                rows.push(row);
            });
            request.on('error', function (err) {
                console.log("we errored in sql insert request " + err);
                return reject(err);
            });
            request.on('done', function () {
                console.log("we done with sql insert request");
                return resolve(rows);
            });
        })
    }

    //This function querys nextgen for all parts neccesary to generate a resident
    var nextGenResidentQuery = function () {
        return new Promise(function (resolve, reject) {
            var queryAddition;
            // if we have a startdate and enddate we will run residents between dates
            // else we will run residents in the last 10 minutes

            if (consolePersonId) {
                queryAddition = "(person.person_id = '" + consolePersonId + "' )";
                console.log(queryAddition);
            } else if (startDate && endDate) { 
                console.log("have startdate " + startDate + " and endDate " + endDate);
                queryAddition = "(person.modify_timestamp between '" + startDate + "' and '" + endDate +
                    "' ) or ( guarantor.modify_timestamp between '" + startDate + "' and '" + endDate + "' )";
            } else if (consoleEmployerName) {
                queryAddition = "mstr_lists.mstr_list_item_desc = '" + consoleEmployerName + "'";
                console.log("help " + queryAddition);
            } else {
                queryAddition = "(person.modify_timestamp < CURRENT_TIMESTAMP and person.modify_timestamp > DateADD(mi, -10, Current_TimeStamp)) \
                or (guarantor.modify_timestamp < CURRENT_TIMESTAMP and guarantor.modify_timestamp > DateADD(mi, -10, Current_TimeStamp)) ";
            }

            var query = "select person.person_id as nextgenPersonId,\
                    person.expired_ind as isDeceased,\
                    person.first_name as firstName,\
                    person.last_name as lastName,\
                    person.middle_name as middleInitial,\
                    person.date_of_birth as birthDate,\
                    person.ssn as socialSecurityNumber,\
                    person.sex as gender,\
                    person.create_timestamp as personCreatedTimeStamp,\
                    person.modify_timestamp as personModifiedTimeStamp,\
                    person.ethnicity as ethnicity,\
                    person.language as prefLanguage,\
                    person.race as race,\
                    guarantor.first_name as guarFirstName,\
                    guarantor.last_name as guarLastName,\
                    guarantor.middle_name as guarMiddleName,\
                    guarantor.address_line_1 as guarAddressLineOne,\
                    guarantor.address_line_2 as guarAddressLineTwo,\
                    guarantor.city as guarCity,\
                    guarantor.state as guarState,\
                    guarantor.zip as guarZip,\
                    guarantor.county as guarCounty,\
                    guarantor.home_phone as guarHomePhone,\
                    guarantor.cell_phone as guarCellPhone,\
                    guarantor.day_phone as guarDayPhone,\
                    guarantor.alt_phone as guarAltPhone,\
                    guarantor.date_of_birth as guarBirthDate,\
                    guarantor.ssn as guarSocialSecurityNumber,\
                    guarantor.sex as guarGender,\
                    guarantor.email_address as guarEmail,\
                    guarantor.create_timestamp as guarantorCreatedTimeStamp,\
                    guarantor.modify_timestamp as guarantorModifiedTimeStamp,\
                    mstr_lists.mstr_list_item_desc as nextgenLocationName,\
                    person_external_xref.external_id as entityKey,\
                    person_external_xref.person_id as xref,\
                    patient_status_mstr.description as dischargeStatus,\
                      (select top 1 payer_name \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp desc \
                      ) as InsName1,\
                      (select top 1 policy_nbr \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp desc \
                      ) as InsNumber1, \
                      (select payer_name \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsName2,\
                      (select policy_nbr \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsNumber2,\
                     (select payer_name \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 2 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsName3, \
                      (select policy_nbr \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 2 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsNumber3,\
                     (select payer_name \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 3 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsName4,\
                      (select policy_nbr \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 3 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsNumber4, \
                     (select payer_name \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 4 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsName5, \
                      (select policy_nbr \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 4 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsNumber5, \
                     (select payer_name \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 5 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsName6, \
                      (select policy_nbr \
                        from SQL01." + sql01env + ".dbo.person_payer \
                        where person.person_id = person_payer.person_id \
                        order by person_payer.create_timestamp asc OFFSET 5 ROWS FETCH NEXT 1 ROWS ONLY \
                      ) as InsNumber6 \
                from SQL01." + sql01env + ".dbo.person \
                left outer join SQL01." + sql01env + ".dbo.person_merge_log on person.person_id = person_merge_log.drop_person_id \
                inner join SQL01." + sql01env + ".dbo.patient on patient.person_id = person.person_id AND person.practice_id = patient.practice_id \
                left outer join SQL01." + sql01env + ".dbo.person_ud on person.person_id = person_ud.person_id \
                left outer join SQL01." + sql01env + ".dbo.mstr_lists on person_ud.ud_demo1_id = mstr_list_item_id \
                left outer join SQL01." + sql01env + ".dbo.person as guarantor on patient.guar_id = guarantor.person_id \
                left outer join SQL01." + sql01env + ".dbo.user_mstr on person.created_by = user_mstr.user_id \
                left outer join SQL01." + sql01env + ".dbo.person_external_xref on person.person_id = person_external_xref.person_id \
                left outer join SQL01." + sql01env + ".dbo.patient_status on person.person_id = patient_status.person_id and patient_status_id is not null \
                left outer join SQL01." + sql01env + ".dbo.patient_status_mstr on patient_status.patient_status_id = patient_status_mstr.patient_status_id \
                where person_merge_log.drop_person_id IS null and " + queryAddition + " order by person.modify_timestamp, guarantor.modify_timestamp;";

            //leaving this comment to quickly run a single person again
            //where person.last_name = 'Orr' and person.first_name = 'Raymond'"
            console.log("connected to sql01");
            const request = new sql.Request();
            request.stream = true;
            request.query(query);

            var rows = [];
            request.on('row', function (row) {
                rows.push(row);
            });
            request.on('error', function (err) {
                console.log("we errored in sql read request " + err);
                return reject(err);
            });
            request.on('done', function () {
                console.log("we done with sql read request");
                return resolve(rows);
            });
        })
    }

    ///////////////////Stop Declaring SQL Functions/////////////////////

    ///////////////////Start Script/////////////////////

    superagent
        .post(`${authSeviceBaseURL}/login`)
        .send(login)
        .set('Content-type', 'application/json; charset=utf-8')
        .end((err, res) => {
            if (err || !res.ok) {
                console.log(err);
                throw new Error("auth failed");
                process.exit(1);
            } else {
                var authToken = res.body.token;

                console.log("authtoken = " + authToken);
                nextGenResidentQuery().then(
                    function (res) {
                        var residentsContainer = [];

                        res.forEach(function (SQLresident) {
                            residentsContainer.push(function (done) {

                                // if (process.env.NODE_ENV !== "production") {
                                //     SQLresident.nextgenLocationName = "test";
                                // }


                                ResidentController.createResidentFromSql(authToken, SQLresident).then(
                                    function (res) {
                                        console.log("created");
                                        if (SQLresident.entityKey && SQLresident.entityKey !== 'null') {
                                            console.log("got this far " + SQLresident.entityKey + " " + res.entityKey);

                                            if (SQLresident.entityKey === res.entityKey) {
                                                console.log("entityKey already exists and is equal");
                                                async.setImmediate(done);
                                            } else {
                                                // Update person_external_xref record
                                                console.log("updating " + res.entityKey + " " + res.ehr.nextgen.personId);
                                                updateEntityKey(res.entityKey, res.ehr.nextgen.personId).then(
                                                    function () {
                                                        async.setImmediate(done);
                                                    },
                                                    function (err) {
                                                        console.log(err);
                                                        async.setImmediate(function () {
                                                            done(null);
                                                        });

                                                    }
                                                );
                                            }
                                        } else {
                                            console.log("inserted " + res.entityKey + " " + res.ehr.nextgen.personId);
                                            // Create person_external_xref record
                                            insertEntityKey(res.entityKey, res.ehr.nextgen.personId).then(
                                                function () {

                                                    async.setImmediate(done);
                                                },
                                                function (err) {
                                                    console.error(JSON.stringify(err));
                                                    async.setImmediate(function () {
                                                        done(null);
                                                    });
                                                });
                                        }
                                    }, function (err) {
                                        console.log("this is it " + err);
                                        console.error(JSON.stringify(err));
                                        async.setImmediate(function () {
                                            // cant pass error - want to keep running even if a resident fails
                                            done(null);
                                        });

                                    });
                            })
                        });

                        async.parallelLimit(residentsContainer, 4, function (err) {
                            console.log("fin");
                            sql.close();
                            process.exit(0);
                        });
                    },
                    function (err) {
                        console.error(err);
                        process.exit(1);
                    }
                )
            }
        })
})

 ///////////////////End Script/////////////////////