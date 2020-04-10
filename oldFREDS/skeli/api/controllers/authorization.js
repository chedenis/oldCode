

var passport = require('passport');
var BearerStrategy = require('passport-http-bearer');

var Authorization = function (options) {
    if (typeof options === 'undefined') options = {};


    var setBearerStrategy = function () {
        passport.use(new BearerStrategy(
            function (token, done) {
                var options = url.parse(config.get('authentication.hostname'));
                options.headers = {
                    'Authorization': 'Bearer ' + token
                };

                var protocolType = https;
                if (options.protocol === 'http:') {
                    protocolType = http;
                }

                protocolType.get(options, function (res) {
                    logger.info('Authentication status:', res.statusCode, res.statusMessage);
                    if (res.statusCode === 200) {
                        res.on('data', function (chunk) {
                            var session = JSON.parse(chunk.toString());
                            logger.info('Authenticated...');
                            logger.debug('Session...', session);
                            var allowedRoles = config.get('allowedRoles');
                            var userRoles = session.user.roles;
                            var authorizedRoles = allowedRoles.filter(function (role) {
                                return role === '*' || userRoles.indexOf(role) != -1;
                            });
                            if (authorizedRoles.length > 0) {
                                return done(null, session, 'all');
                            }
                            else {
                                logger.info('User ' + session.user.userId + ' does not have one of the required allowedRoles: [' + allowedRoles.join(', ') + ']');
                                return done(null, false);
                            }
                        });
                    }
                    else
                        return done(null, false);
                }).on('error', function (e) {
                    done(e, null, false);
                });
            }

        ));
    }

    var authorize = function() {
        setBearerStrategy();
        passport.authenticate('bearer', { session: false });
    }

    return {
        authorize: authorize
    };
};

module.exports = Authorization;
