const express = require('express');
const router = express.Router();
//const logger = require('winston');
//const config = require('config');

router.route('/heartbeat').get((req, res) => res.status(200).send());

router.route('/checkDeposit').post((req, res) => {
    console.log("got to queue - wahoo");
    const requestObject = {
        transaction: req.body,
        route: "/payment/checkDeposit"
    }

    const tpaRequest = new TpaRequestQueue(requestObject);
    console.log(JSON.stringify(requestObject));
    tpaRequest.save(function (err, returnedTpaRequest) {
        if (err) {
            console.log("err tpa " + err);
            return res.status(500).send({ "transactionId": returnedTpaRequest.transactionId })
        } else {
            console.log("we good tpa");
            return res.status(200).send({ "transactionId": returnedTpaRequest.transactionId })
        }
    });
});

module.exports = router;
