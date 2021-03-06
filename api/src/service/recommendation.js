const superagent = require('superagent');
const geolib = require('geolib');

// eslint-disable-next-line no-unused-vars
const ValidationRequest = require('../model/request-body/validation-request');
// eslint-disable-next-line no-unused-vars
const RecommendationRequest = require('../model/request-body/recommendation-request');
const RecommendationAccuracy = require('../model/recommendation-accuracy');
const RecommendedCategory = require('../model/recommended-category');
const Persistence = require('../persistence/persistence');
// eslint-disable-next-line no-unused-vars
const PointOfInterest = require('../model/point-of-interest');
const RecommendedPoi = require('../model/recommended-poi');
const AddRecommendedPoi = require('../model/request-body/add-recommended-poi');

class RecommendationService {
    /**
     * @type {string}
     */
    static _api_url;

    /**
     * Sets the URL for the Context Aware REST APIs.
     * @param {string} apiUrl 
     */
    static set api_url(apiUrl) {
        this._api_url = apiUrl + 'recommendation/';
    }

    /**
     * Saves a new recommended point of interest.
     * 
     * @param {AddRecommendedPoi} recommendedPoi the new recommended Poi.
     * @param {string} user the user that the personal recommended poi should be added.
     * @returns {Promise<string>} the recommended point of interest id.
     */
    static async addRecommendedPoi(recommendedPoi, user)  {
        if(!(recommendedPoi instanceof AddRecommendedPoi)) {
            console.error(`Argument recommendedPoi instantiated with ${recommendedPoi} is not of type AddRecommendedPoi.`);
            throw new TypeError(`Argument recommendedPoi instantiated with ${recommendedPoi} is not of type AddRecommendedPoi.`);
        }

        const recommendedPoiToAdd = RecommendedPoi.fromAddRecommendedPoi(recommendedPoi);
        
        const rpId = await Persistence.addPersonalRecommededPoi(recommendedPoiToAdd, user);

        return rpId;
    }

    /**
     * Checks whether `validationRequest` is correct (geofencing client-side).
     * 
     * @param {ValidationRequest} validationRequest the request for validation.
     * @returns {Promise<boolean>} `true` if the suggested category for the place is valid, `false` if not valid, `null` otherwise.
     */
    static async shouldAdvisePlaceCategory(validationRequest) {
        if (!(validationRequest instanceof ValidationRequest)) {
            console.error(`Argument validationRequest instantiated with ${validationRequest} is not of type ValidationRequest.`);
            throw new TypeError(`Argument validationRequest instantiated with ${validationRequest} is not of type ValidationRequest.`);
        }
        try {
            const validity_result = await superagent.get(this._api_url + 'validity').query(validationRequest);

            /**
             * @type number
             */
            const isPlaceValid = validity_result.body.result; // 1 (true) or 0 (false).
            
            if (isPlaceValid === 1) {
                const recommendedCategory = new RecommendedCategory(validationRequest.place_category);

                const recommendationRequest = new RecommendationRequest(
                    validationRequest.user,
                    validationRequest.latitude,
                    validationRequest.longitude,
                    validationRequest.human_activity,
                    validationRequest.seconds_in_day,
                    validationRequest.week_day
                );
                const suggestPointOfInterest = await this.getNearestPoiOfGivenCategoryOfUser(recommendedCategory, recommendationRequest);
                
                if (suggestPointOfInterest !== null) {
                    const canNotify = await this.canNotifyPoi(suggestPointOfInterest, recommendationRequest.user);

                    //poi can be notified so adding it to firebase
                    if(canNotify) {
                        await Persistence.notifySuggestionForPlace(suggestPointOfInterest, recommendationRequest.user, 'You are near to this place:', 'validity-recommendation');
                        
                        const notificationDate = Math.floor(Date.now() / 1000);
                        const addRecommendPoi = new AddRecommendedPoi(suggestPointOfInterest.markId, notificationDate);
                        await this.addRecommendedPoi(addRecommendPoi, recommendationRequest.user);
                    } else {
                        console.warn(`Point of interest with markId=${suggestPointOfInterest.markId} has already been recommended to ${validationRequest.user} less than an hour ago.`);
                    }
                } else {
                    console.warn(`In the area around the point with latitude=${validationRequest.latitude} and longitude=${validationRequest.longitude} has no points of interest for the user.`);
                }
            } else {
                console.warn(`Not recommending anything since the place_category=${validationRequest.place_category} is not advisable now.`);
            }
            return isPlaceValid === 1;
        } catch (error) {
            console.error('The HTTP call to the context aware APIs validity returned the following error:' + error);

            return null;
        }
    }

    /**
     * Given data from {query} returns the recommended place category and sends a notification to the user with a place of that category.
     * 
     * @param {RecommendationRequest} recommendationRequest (latitude, longitude, human_activity, seconds_in_day, week_day)
     * @returns {Promise<RecommendedCategory>} the recommended place category if data is correct, `null` otherwise.
     */
    static async recommendPlaceOfCategory(recommendationRequest) {
        if (!(recommendationRequest instanceof RecommendationRequest)) {
            console.error(`Argument recommendationRequest instantiated with ${recommendationRequest} is not of type RecommendationRequest.`);
            throw new TypeError(`Argument recommendationRequest instantiated with ${recommendationRequest} is not of type RecommendationRequest.`);
        }
        try {
            const response = await superagent.get(this._api_url + 'places').query(recommendationRequest);

            const body = response.body;
            const recommendedCategory = new RecommendedCategory(body.place_category);
            console.info(`Found category ${recommendedCategory.place_category}`);
            const suggestPointOfInterest = await this.getNearestPoiOfGivenCategory(recommendedCategory, recommendationRequest);

            if (suggestPointOfInterest !== null) {
                const canNotify = await this.canNotifyPoi(suggestPointOfInterest,recommendationRequest.user);
                
                //in this case the poi should always notified thanks to getNearestPoiOfGivenCategory
                if(canNotify) {
                    await Persistence.notifySuggestionForPlace(suggestPointOfInterest, recommendationRequest.user, 'You may be interested to this place:', 'place-recommendation');

                    const notificationDate = Math.floor(Date.now() / 1000);
                    const addRecommendPoi = new AddRecommendedPoi(suggestPointOfInterest.markId, notificationDate);
                    await this.addRecommendedPoi(addRecommendPoi,recommendationRequest.user);
                } else {
                    console.warn(`Point of interest with markId=${suggestPointOfInterest.markId} has already been recommended to ${recommendationRequest.user} less than an hour ago.`);
                }                
            } else {
                console.warn(`Not found any point of interest of place_category=${body.place_category} near the user=${recommendationRequest.user}.`);
            }

            return recommendedCategory;
        } catch (error) {
            console.error('The HTTP call to the context aware APIs places returned the following error:' + error);

            return null;
        }
    }


    /**
     * Asks for the current model to be trained again with the new given record `recommendationRequest`.
     * @param {ValidationRequest} validationRequest the new data for the model to be trained.
     * @returns {Promise<RecommendationAccuracy>} the new accuracy of the model.
     */
    static async trainAgainModel(validationRequest) {
        try {
            const train_result = await superagent.post(this._api_url + 'train').send(validationRequest.toJsObject());

            const body = train_result.body;

            const recommendationAccuracy = new RecommendationAccuracy(body.accuracy, body.correct_samples);

            await Persistence.notifyRetrainedModel(recommendationAccuracy, validationRequest.user);

            return recommendationAccuracy;
        } catch (error) {
            console.error('The HTTP call to the context aware APIs returned the following error:' + error);

            return null;
        }
    }
    /**
     * 
     * @param {RecommendedCategory} recommendedCategory contains place_category to be notified
     * @param {RecommendationRequest} recommendationRequest name of user that made the request
     * @returns {Promise<PointOfInterest>}
     */
    static async getNearestPoiOfGivenCategoryOfUser(recommendedCategory, recommendationRequest) {
        const user = recommendationRequest.user;
        await Persistence.checkIfUserDocumentExists(user);

        /**
         * @type Array<PointOfInterest>
         */
        let poisList = await Persistence.getPOIsOfUser(user);

        const lat_lon_mapped = poisList
            .filter((poi) => poi.type.toLowerCase() === recommendedCategory.place_category.toLowerCase())
            // eslint-disable-next-line no-unused-vars
            .map((poi, _, __) => {
                return {
                    latitude: poi.latitude,
                    longitude: poi.longitude
                };
            });
        const userPosition = {
            latitude: recommendationRequest.latitude,
            longitude: recommendationRequest.longitude
        };

        const nearest = geolib.findNearest(userPosition, lat_lon_mapped);

        const distance = geolib.getDistance(userPosition, nearest);

        let returnedPoi = null;
        if (distance < 3000) {
            for (const poi of poisList) {
                // @ts-ignore
                if (poi.latitude == nearest.latitude && poi.longitude == nearest.longitude) {
                    returnedPoi = poi;
                    break;
                }
            }
        }

        return returnedPoi;
    }
    /**
     * 
     * @param {RecommendedCategory} recommendedCategory contains place_category to be notified
     * @param {RecommendationRequest} recommendationRequest name of user that made the request
     * @returns {Promise<PointOfInterest>}
     */
    static async getNearestPoiOfGivenCategory(recommendedCategory, recommendationRequest) {
        const user = recommendationRequest.user;
        await Persistence.checkIfUserDocumentExists(user);

        // Returns the whole objects of the friends of user.
        const friendList = await Persistence.getFriends(user);

        /**
         * @type Array<PointOfInterest>
         */
        let poisList = [];

        // Retrieving the list of points of interest of the friends and of the user.
        for (const friend of friendList) {
            const friendPoint = await Persistence.getPOIsOfUser(friend.friendUsername);
            poisList = poisList.concat(friendPoint);
        }
        poisList = poisList.concat(await Persistence.getPOIsOfUser(user));

        
        const alreadyRecommendedPoi = await Persistence.getPersonalRecommededPoi(user);
        const lat_lon_mapped = poisList
            .filter((poi) => poi.type.toLowerCase() === recommendedCategory.place_category.toLowerCase() && alreadyRecommendedPoi.findIndex((rp) => rp.markId === poi.markId) === -1)
            // eslint-disable-next-line no-unused-vars
            .map((poi, _, __) => {
                return {
                    latitude: poi.latitude,
                    longitude: poi.longitude
                };
            });
        const userPosition = {
            latitude: recommendationRequest.latitude,
            longitude: recommendationRequest.longitude
        };

        const nearest = geolib.findNearest(userPosition, lat_lon_mapped);

        const distance = geolib.getDistance(userPosition, nearest);

        let returnedPoi = null;
        if (distance < 3000) {
            for (const poi of poisList) {
                // @ts-ignore
                if (poi.latitude == nearest.latitude && poi.longitude == nearest.longitude) {
                    returnedPoi = poi;
                    break;
                }
            }
        }
        return returnedPoi;
    }

    /**
    * Removes all expired live events.
    */
    static async cleanExpiredRecommendedPoi() {
        const usersList = await Persistence.getUsersList();

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const oneHouerTimeStamp = 3600;
        for(const user of usersList) {
            const recommededPois = await Persistence.getPersonalRecommededPoi(user);
            
            for(const rp of recommededPois) {
                if(rp.notificatedDate + oneHouerTimeStamp < currentTimestamp) {
                    await Persistence.removePersonalRecommededPoi(rp.id, user);
                }
            }

        }
    }
    /**
     * 
     * @param {PointOfInterest} poi PointOfIntereset that the server want to suggest
     * @param {string} user username of the user that has to check if the poi could be recommended 
     * @returns {Promise<boolean>}
     */
    static async canNotifyPoi(poi, user){
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const oneHouerTimeStamp = 3600;

        const recommededPois = await Persistence.getPersonalRecommededPoi(user);
        const rp = recommededPois.filter((recommendedPoi) => recommendedPoi.markId === poi.markId);
        
        if(rp.length == 0) {
            return true;
        }
        
        if(rp[0].notificatedDate + oneHouerTimeStamp < currentTimestamp) {
            await Persistence.removePersonalRecommededPoi(rp[0].id, user);
            return true;
        }
        
        return false;
    }

}

module.exports = RecommendationService;