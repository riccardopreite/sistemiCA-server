const LiveEvent = require('../model/live-event');
const AddLiveEvent = require('../model/request-body/add-live-event');

const Persistence = require('../persistence/persistence');
const { validatePrimitiveType } = require('../utils/validate-arguments');

class LiveEventService {
    /**
     * Gets the list of live events published by `user`.
     * 
     * @param {string} user The user of which the list must be retrieved.
     * @returns a list of `LiveEvent`. 
     */
    static async getLiveEvents(user) {
        validatePrimitiveType(user, 'string');
        
        const currentSeconds = Math.floor(Date.now() / 1000);
        return (await Persistence.getPersonalLiveEvents(user)).concat(
            await Persistence.getLiveEventsFromFriends(user)
        ).filter((liveEvent) => liveEvent.expirationDate > currentSeconds);
    }

    /**
     * Publishes a new live event.
     * 
     * @param {AddLiveEvent} liveEvent the new live event.
     * @returns the live event id.
     */
    static async addLiveEvent(liveEvent)  {
        if(!(liveEvent instanceof AddLiveEvent)) {
            console.error(`Argument liveEvent instantiated with ${liveEvent} is not of type AddLiveEvent.`);
            throw new TypeError(`Argument liveEvent instantiated with ${liveEvent} is not of type AddLiveEvent.`);
        }

        const liveEventToAdd = LiveEvent.fromLiveEvent(liveEvent);
        
        const leId = await Persistence.addLiveEvent(liveEventToAdd);

        console.log(leId);
        
        if(leId !== null) {
            console.log('notifying');
            await Persistence.notifyAddLiveEvent(liveEventToAdd);
        }
        return leId;
    }

    /**
     * Removes all expired live events.
     */
    static async clearExpiredLiveEvents() {
        const usersList = await Persistence.getUsersList();

        const currentTimestamp = Math.floor(Date.now() / 1000);
        for(const user of usersList) {
            const userLEs = await Persistence.getPersonalLiveEvents(user);
            
            for(const le of userLEs) {
                if(le.expirationDate < currentTimestamp) {
                    await Persistence.removePersonalLiveEvent(le.id, user);
                }
            }

            const lesOfFriends = await Persistence.getLiveEventsFromFriends(user);

            for(const le of lesOfFriends) {
                if(le.expirationDate < currentTimestamp) {
                    await Persistence.removeFriendsLiveEvent(le.id, user);
                }
            }
        }
    }
}

module.exports = LiveEventService;