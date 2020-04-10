console.log("ENV " + process.env.NODE_ENV);

/////////////////////Start Declaring Variables////////////////////

var MongoClient = require('mongodb').MongoClient;
var sql = require('mssql');
var async = require("async");
var superagent = require('superagent');
var startDate = false;
var endDate = false;
var config;
var sql02env;

if (process.env.NODE_ENV === "production") {
    config = require('../config/production.json')
    sql02env = "NGProd";
} else if (process.env.NODE_ENV === "qa") {
    config = require('../config/qa.json')
    sql02env = "NGTEST";
} else if (process.env.NODE_ENV === "development") {
    config = require('../config/default.json');
    sql02env = "NGTEST";
} else {
    config = require('../config/default.json');
    sql02env = "NGTEST";
    // throw new Error("No env provided");
    // process.exit(1);
}

var authSeviceBaseURL = config.authSeviceBaseURL;
var residentBaseUrl = config.residentBaseUrl;
var login = config.fredsLogin;
var sql02Options = config.sql02Options;
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
});

/////////////////////End Declaring Variables////////////////////

///////////////////Start Declaring SQL Functions/////////////////////

sql.connect(sql02Options, err => {
    //This function querys greenway for all parts neccesary to generate a resident
    var greenwayResidentQuery = function () {
        return new Promise(function (resolve, reject) {
            var queryAddition;
            // if we have a startdate and enddate we will run residents between dates
            // else we will run residents in the last 10 minutes

            if (startDate && endDate) {
                console.log("have startdate " + startDate + " and endDate " + endDate);
                queryAddition = " AND patient.UPDT_DT BETWEEN TO_DATE(''" + startDate + "'', ''MM/DD/YYYY'') AND TO_DATE(''" + endDate + "'', ''MM/DD/YYYY'')')";
            } else {
                queryAddition = " and ((patient.UPDT_DT >  SYSDATE -  numtodsinterval(15,''MINUTE'') \
                OR status.ASGN_DT >  SYSDATE -  numtodsinterval(15,''MINUTE'')))')"
            }

            var query =
            "Select * From OpenQuery([Mi1614DB],  \
                'Select  \
                guar.GU_FNAME guarFirstName, \
                guar.GU_LNAME guarLastName, \
                guar.GU_ADDR1 guarAddressLineOne, \
                guar.GU_ADDR2 guarAddressLineTwo, \
                guar.GU_CITY_NAME guarCity, \
                guar.GU_STATE guarState, \
                guar.GU_ZIP_CODE guarZip, \
                guar.GU_SEX guarGender, \
                guar.GU_HOME_PHNO guarHomePhone, \
                patient.PR_ACCT_ID greenwayId, \
                patient.PR_FNAME firstName, \
                patient.PR_LNAME lastName, \
                patient.PR_SSN socialSecurityNumber, \
                patient.PR_ETHNICITY ethnicity, \
                patient.PR_BIRTH_DT birthDate, \
                patient.UPDT_DT patientTimeStamp, \
                employer.E_NAME employerName, \
                status.ASGN_DT statusTimeStamp, \
                status.STATUS_NAME statusName From EHS.PATIENT_REGISTER patient \
                LEFT JOIN EHS.UV_GU_DEMOGRAPHICS guar ON patient.GU_ID = guar.GU_ID  \
                LEFT JOIN EHS.V_PATIENTSTATUS status ON patient.PR_ACCT_ID = status.PR_ACCT_ID and (status.STATUS_NAME = ''DECEASED'' or status.STATUS_NAME = ''DISCHARGED PATIENT'') \
                LEFT JOIN EHS.EMPLOYER employer ON patient.E_ID = employer.E_ID \
                WHERE patient.E_ID IS NOT NULL" + queryAddition;
               

            console.log("connected to sql02");
            const request = new sql.Request();
            request.stream = true;
            request.query(query);
            var count = 0;
            var rows = [];
            request.on('row', function (row) {
                count++
                rows.push(row);
            });
            request.on('error', function (err) {
                console.log("we errored in sql read request " + err);
                return reject(err);
            });
            request.on('done', function () {
                console.log("we done with sql read request");
                console.log(count);
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

                greenwayResidentQuery().then(function (res) {
                    console.log("yeah budddddy");
                    var functionContainer = [];

                    res.forEach(function (SQLresident) {
                        functionContainer.push(function (done) {
                            ResidentController.createResidentFromSql(authToken, SQLresident).then(
                                function (res) {
                                    console.log("create resident succesful");
                                    async.setImmediate(done);
                                }, function (err) {
                                    console.log("errrorrrrrorrr")
                                    console.log(JSON.stringify(err));
                                    async.setImmediate(function () {
                                        // cant pass error - want to keep running even if a resident fails
                                        done(null);
                                    });
                                });
                        });


                    })

                    async.parallelLimit(functionContainer, 4, function (err) {
                        console.log("fin");
                        sql.close();
                    });

                }, function (err) {
                    console.log("nooo " + err);
                    process.exit(1);
                });
            }
        }

        );
});



 ///////////////////End Script/////////////////////
