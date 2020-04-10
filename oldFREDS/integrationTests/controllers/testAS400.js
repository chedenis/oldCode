const testAS400Controller = (options) => {
    if (typeof options === 'undefined') options = {};
    const config = options.config;
    const logger = options.logger;
    var as400 = config.get('as400');
    const db2 = require('node-jt400');

    const db2Query = function (query) {
        return new Promise(function (resolve, reject) {
            const connectionSettings = {
                host: as400.host,
                user: as400.user,
                password: as400.password
            };

            return db2.connect(connectionSettings).then(
                function (db) {
                    logger.info("db2 Query Connecting");

                    return db.query(query).then(
                        function (results) {
                            return resolve(results);
                        },
                        function (err) {
                            return reject(err);
                        }
                    )
                },
                function (err) {
                    logger.info("db2 Query Failed");
                    return reject(new Error('Failure to connect to as400'));
                }
            )

        });
    }

    const testAS400 = async (database, table, findObject, isMany, index) => {
        return new Promise(async (resolve, reject) => {
            let query = `SELECT * FROM ${database}.${table} Where 1=1 `

            Object.keys(findObject).forEach(function (key) {
                let val = findObject[key];
                query = query + `AND ${key}='${val}' `
            });

            logger.info(query);
            let response = await db2Query(query);
            logger.info(`Test ${index+1} a success`);
            resolve(response);
        })
    }

    return {
        testAS400: testAS400
    };

}


module.exports = testAS400Controller;