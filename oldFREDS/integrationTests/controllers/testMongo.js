const logger = require('winston');
const util = require('util');
const config = require('config');

const testMongoController = (options) => {
    if (typeof options === 'undefined') options = {};

    var mongodb = options.mongodb || false;
    var mongocollection = options.mongocollection || false;

    const testMongo = (findObject, isMany) => {
        return new Promise((resolve, reject) => {

        })
    }

    return {
        testMongo: testMongo,
    };

}


module.exports = testMongoController;