// Set up config and logger
const config = require('freds-config');
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
const FredsLogger = require('freds-logger');
const logger = new FredsLogger({ appName: require('./package.json').name });
logger.add(logger.transports.File, { filename: 'output_logs/output.log' });
const loggerLevelConfigKey = 'logger.level';

// Handle user input
let testFile = false;
let username = false;
let password = false;

logger.info('testing config');
logger.info(config.get('fredsLogin'))

process.argv.forEach((arg) => {
    if (arg.indexOf('testFile=') !== -1) {
        testFile = './testfiles/' + arg.substring(9);
    }
    else if (arg.indexOf('username=') !== -1) {
        logger.info("username is ", arg.substring(9));
        username = arg.substring(9);
    }
    else if (arg.indexOf('password=') !== -1) {
        logger.info("password is ", arg.substring(9));
        password = arg.substring(9);
    }
})

function Throw(e) { throw e; }
let jsonTests;
try {
    testFile ? logger.info('Testfile path:', testFile) : Throw("Error: No Testfile passed");
    username ? logger.info('Username:', username) : Throw('Error: No username passed');
    password ? logger.info('Password:', password) : Throw('Error: No password passed');
    jsonTests = require(testFile).tests;
} catch (err) {
    logger.info(err);
    process.exit(0);
}

logger.debug('Here are the tests processing', jsonTests);

var ProcessTestsController = require('./controllers/processTests')({
    "logger": logger,
    "config":config
});

ProcessTestsController.processTests(jsonTests, username, password).then(
    (success) => {
        logger.info('success');
        logger.info(success);
        process.exit(0);
    },
    (failure) => {
        logger.info('failure');
        logger.info(failure);
        process.exit(0);
    }
);







