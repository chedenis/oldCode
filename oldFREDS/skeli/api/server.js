
const bodyParser = require('body-parser');
const express = require('express');
const router = require('./routers/cofRouter');
const mongoose = require('mongoose');
const logger = require('winston');
const config = require('config');
const mongoConfig = config.get('mongoConfig');

const server = () => {
    const app = express();
    //neccesary to access req.body in requests
    app.use(bodyParser.json()); 
    //If extended is false, you can not post "nested object"
    app.use(bodyParser.urlencoded({ extended: true }));

    const Authorization = require('./controllers/authorization')();
    app.use(function (req, res, next) {
        Authorization.authorize();
        next();
    });
    app.use('/', router);

    var port = config.get('server.port');
    return app.listen(port, () => logger.info(`Listening on port ${port}...`));
}


const init = () => {
    mongoose.connection.on('connecting', () => {
        logger.info('Connecting to MongoDB...');
    });

    mongoose.connection.on('error', error => {
        logger.error(`Error in MongoDb connection: ${error}`);
        return mongoose.disconnect();
    });

    mongoose.connection.on('connected', () => logger.info('Connected to MongoDB.'));

    mongoose.connection.once('open', () => {
        logger.info('MongoDB connection open.');
        return server(); // Server is started once database connection is open.
    });

    mongoose.connection.on('reconnected', () => logger.info('Reconnected to MongoDB.'));

    mongoose.connection.on('disconnected', function () {
        logger.info(`Disconnected from MongoDB. URI is ${mongoConfig.uri}`);
        setTimeout(() => mongoose.connect(mongoConfig.uri, mongoConfig.options), 500);
    });

    return mongoose.connect(mongoConfig.uri, mongoConfig.options);
};

init();
