class AddLiveEvent {
    /**
     * Constructs a live event creation request body.
     * 
     * @param {number} expiresAfter Minutes after which the event expires.
     * @param {string} owner Username of the person which adds the event to the system.
     * @param {string} name Name of the event.
     * @param {string} address Address in which the event takes place.
     */
    constructor(expiresAfter, owner, name, address) {
        if(!(typeof(expiresAfter) === 'number')) {
            console.error(`Argument ${expiresAfter} is not a number`);
            throw TypeError(`Argument ${expiresAfter} is not a number`);
        }
        if(!(typeof(owner) === 'string')) {
            console.error(`Argument ${owner} is not a string`);
            throw TypeError(`Argument ${owner} is not a string`);
        }
        if(!(typeof(name) === 'string')) {
            console.error(`Argument ${name} is not a string`);
            throw TypeError(`Argument ${name} is not a string`);
        }
        if(!(typeof(address) === 'string')) {
            console.error(`Argument ${address} is not a string`);
            throw TypeError(`Argument ${address} is not a string`);
        }

        this.expiresAfter = expiresAfter;
        this.owner = owner;
        this.name = name;
        this.address = address;
    }
}

module.exports = AddLiveEvent;