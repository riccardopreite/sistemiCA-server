let express = require('express');
let router = express.Router();
const recommendation = require('../service/recommendation');
const auth = require('../service/auth');
const APIError = require('../model/api-error');
const RecommendationRequest = require('../model/request-body/recommendation-request');
const ValidationRequest = require('../model/request-body/validation-request');
const crypto = require('crypto');
const { validateApiCall } = require('../utils/validate-api-call');

let privateKey = '';

/**
 * Sets the private key to use it for decrypting messages received by the clients.
 * 
 * @param {string} privateKeyFromApp Server privatekey
 */
function setPrivateKey(privateKeyFromApp) {
    privateKey = privateKeyFromApp;
}

/**
 * Given a ciphertext returns the decrypted message.
 * 
 * @param {string} ciphertext the encrypted message
 * @returns {string} The decrypted message
 */
function decryptStringWithRsaPrivateKey(ciphertext) {
    const buffer = Buffer.from(ciphertext, 'base64');
    const decrypted = crypto.privateDecrypt({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, buffer);
    return decrypted.toString('utf8');
}

router.post('/places', async (req, res) => {
    const decryptedBody = decryptStringWithRsaPrivateKey(req.body);
    const body = JSON.parse(decryptedBody);
    const user = body.user + '';
    const apiCallCheck = await validateApiCall(req.headers, user);
    if(Object.keys(apiCallCheck).length === 2) {
        res.status(apiCallCheck.code).json(apiCallCheck.error).send();
        return;
    }

    const recommendationRequest = new RecommendationRequest(
        user,
        parseFloat(body.latitude + ''),
        parseFloat(body.longitude + ''),
        body.human_activity + '',
        parseInt(body.seconds_in_day + ''),
        parseInt(body.week_day + '')
    );

    const result = await recommendation.recommendPlaceOfCategory(recommendationRequest);

    if(result !== null) {
        res.status(200).json(result).send();
    } else {
        res.status(400).send();
    }
});

router.post('/validity', async (req, res) => {
    const decryptedBody = decryptStringWithRsaPrivateKey(req.body);
    const body = JSON.parse(decryptedBody);
    const user = body.user + '';
    const apiCallCheck = await validateApiCall(req.headers, user);
    if(Object.keys(apiCallCheck).length === 2) {
        res.status(apiCallCheck.code).json(apiCallCheck.error).send();
        return;
    }

    const validationRequest = new ValidationRequest(
        user,
        parseFloat(body.latitude + ''),
        parseFloat(body.longitude + ''),
        body.human_activity + '',
        parseInt(body.seconds_in_day + ''),
        parseInt(body.week_day + ''),
        body.place_category + ''
    );

    const result = await recommendation.shouldAdvisePlaceCategory(validationRequest);

    if(result !== null) {
        res.status(200).json(result).send();
    } else {
        res.status(400).send();
    }
});


router.post('/train', async (req, res) => {
    const decryptedBody = decryptStringWithRsaPrivateKey(req.body);
    const body = JSON.parse(decryptedBody);
    const token = auth.parseHeaders(req.headers);
    if(token === null) {
        console.error('> Status code 401 - Token not available.');
        res.status(401).json(APIError.build('Token not available.')).send();
        return;
    }
    let user = await auth.verifyToken(token);
    if(user === null || user != body.user) {
        console.error(`> Status code 403 - User from the authentication service is ${user} and that from body is ${body.user}.`);
        res.status(403).json(APIError.build(`User from the authentication service is ${user} and that from body is ${body.user}.`)).send();
        return;
    }

    const trainRequest = new ValidationRequest(
        user,
        body.latitude,
        body.longitude,
        body.human_activity,
        parseInt(body.seconds_in_day + ''),
        parseInt(body.week_day + ''),
        body.place_category
    );

    await recommendation.trainAgainModel(trainRequest).then(console.info, console.error);

    res.status(200).send();
});

async function cleanExpiredRecommendedPoi() {
    await recommendation.cleanExpiredRecommendedPoi();
}

module.exports = {
    recommendation: router,
    setPrivateKey,
    cleanExpiredRecommendedPoi
};
