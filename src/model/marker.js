class Marker {
    /**
     * Creates a Marker that is a point of interest of a user.
     * 
     * @param {string} id  Identifier.
     * @param {string} address Address reverse geocoded from latitude and longitude of the place.
     * @param {string} cont Description of the place (what is it).
     * @param {number} latitude Latitude of the place.
     * @param {number} longitude Longitude of the place.
     * @param {string} name Name chosen by the user for the point of interest.
     * @param {string} phoneNumber Phone number for the point of interest.
     * @param {string} visibility Visibility of the event.
     * @param {string} url URL linked to the event.
     */
    constructor(id, address, cont, latitude, longitude, name, phoneNumber, visibility, url) {
        if(!(typeof(id) === 'string')) {
            console.error(`Argument ${id} is not a string`);
            throw TypeError(`Argument ${id} is not a string`);
        }
        if(!(typeof(address) === 'string')) {
            console.error(`Argument ${address} is not a string`);
            throw TypeError(`Argument ${address} is not a string`);
        }
        if(!(typeof(cont) === 'string')) {
            console.error(`Argument ${cont} is not a string`);
            throw TypeError(`Argument ${cont} is not a string`);
        }
        if(!(typeof(latitude) === 'number')) {
            console.error(`Argument ${latitude} is not a number`);
            throw TypeError(`Argument ${latitude} is not a number`);
        }
        if(!(typeof(longitude) === 'number')) {
            console.error(`Argument ${longitude} is not a number`);
            throw TypeError(`Argument ${longitude} is not a number`);
        }
        if(!(typeof(name) === 'string')) {
            console.error(`Argument ${name} is not a string`);
            throw TypeError(`Argument ${name} is not a string`);
        }
        if(!(typeof(phoneNumber) === 'string')) {
            console.error(`Argument ${phoneNumber} is not a string`);
            throw TypeError(`Argument ${phoneNumber} is not a string`);
        }
        if(!(typeof(visibility) === 'string')) {
            console.error(`Argument ${visibility} is not a string`);
            throw TypeError(`Argument ${visibility} is not a string`);
        }
        if(!(typeof(url) === 'string')) {
            console.error(`Argument ${url} is not a string`);
            throw TypeError(`Argument ${url} is not a string`);
        }

        this.id = id;
        this.address = address;
        this.cont = cont;
        this.latitude = latitude;
        this.longitude = longitude;
        this.name = name;
        this.phoneNumber = phoneNumber;
        this.visibility = visibility;
        this.url = url;
    }
}

module.exports = Marker;