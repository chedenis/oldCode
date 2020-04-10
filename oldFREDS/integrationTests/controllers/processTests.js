
const superagent = require('superagent');


const processTestsController = (options) => {
    if (typeof options === 'undefined') options = {};
    const logger = options.logger;
    logger.info('got to processTestsController');
    const config = options.config;
    const authSeviceURL = config.get('auth.url');

    const authenticate = (username, password) => {
        return new Promise((resolve, reject) => {
            logger.info("Authenticating", username);
            superagent
                .post(`${authSeviceURL}/login`)
                .send({ "username": username, "password": password })
                .set('Content-type', 'application/json; charset=utf-8')
                .end((err, res) => {
                    if (err || !res.ok) {
                        console.log(err);
                        return reject(new Error("auth failed"));
                        process.exit(1);
                    } else {
                        var authToken = res.body.token;
                        logger.info("authtoken = " + authToken);
                        return resolve(authToken);
                    }
                })
        });
    }

    const processPost = async (post, path, authToken) => {
        logger.info('Processing post', post);
        return new Promise(async (resolve, reject) => {

            function makeRandom(length) {
                var text = "";
                var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
                for (var i = 0; i < length; i++)
                    text += possible.charAt(Math.floor(Math.random() * possible.length));
                return text;
            }

            Object.keys(post).forEach(function (key) {
                logger.info(key);
                let val = post[key];
                if (val && val.length > 5) {
                    val.startsWith('RANDOM') ? post[key] = makeRandom(val.charAt(6)) : post[key] = val
                }
            });

            logger.info('Random values replaced - ready to post', post);

            superagent
                .post(`${path}`)
                .send(post)
                .set('Authorization', `Bearer ${authToken}`)
                .set('Content-type', 'application/json; charset=utf-8')
                .end((err, res) => {
                    if (err || !res.ok) {
                        logger.error(err);
                        logger.error('Failed to post object', post);
                        return reject(new Error(`Error: Failed to post to path ${path} with authtoken ${authToken}`, err))
                    } else {
                        return resolve(res.body);
                    }
                });
        });
    }

    const processTest = async (processArray, index, authToken) => {
        return new Promise(async (resolve, reject) => {

            try {
                if (processArray[index]) {
                    let test = processArray[index];
                    logger.info('about to process first test', test.sendingObject);
                    await processPost(test.sendingObject, test.route, authToken);
                    logger.info('post processed')
                    if (test.mongo) {
                        //"mongo": [{
                        //    "mongoTestCollection": "",
                        //    "mongoTestObject": ""
                        //}]

                        //await mongo
                    }
                    if (test.sql) {
                        if (test.sql[0].type === "as400" || test.sql[0].type === "db2") {
                            var TestAS400Controller = require('./testAS400')({
                                config: config,
                                logger: logger
                            });
                            await TestAS400Controller.testAS400(test.sql[0].database, test.sql[0].table, test.sql[0].check, false, index);
                        }
                    }
                    return resolve(processTest(processArray, index + 1, authToken));
                } else {
                    return resolve("All tests processed")
                }
            } catch (err) {
                logger.error('errors processing test')
                return reject(err);
            }
        })
    }

    const processTests = async (jsonTests, username, password) => {
        return new Promise(async (resolve, reject) => {
            if (jsonTests && jsonTests.length && jsonTests.length > 0) {
                try {
                    let authToken = await authenticate(username, password);
                    await processTest(jsonTests, 0, authToken);
                } catch (err) {
                    return reject(err);
                }

            } else {
                return reject(new Error('Error: No tests to process'))
            }
        })
    }

    return {
        processTests: processTests,
    };

}

module.exports = processTestsController;