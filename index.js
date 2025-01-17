const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

class FoxholeAPI {
    
    /**
     * @param {string} shard The shard you want to get info from. (e.g 'LIVE1' or leave blank, 'LIVE2', or 'DEV')
     * 
     * Constructor for the FoxholeAPI class.
     */
    constructor(shard) {
        if (!shard || shard === 'LIVE1') {
            this.rootURL = 'https://war-service-live.foxholeservices.com/api';
        } else if (shard === 'LIVE2') {
            this.rootURL = 'https://war-service-live-2.foxholeservices.com/api';
        } else if (shard === 'DEV') {
            this.rootURL = 'https://war-service-dev.foxholeservices.com/api';
        } else {
            console.log("Invalid shard! (e.g 'LIVE1' or 'LIVE2')");
            process.exit(1);
            return;
        }
    }

    /**
     * This returns a promise with information about the current war state.
     */
    async getState() {
        const response = await fetch(`${this.rootURL}/worldconquest/war`);
        const data = await response.json();

        return data;
    }

    /**
     * This returns a promise of all map names.
     */
    async getMaps() {
        const response = await fetch(`${this.rootURL}/worldconquest/maps`);
        const data = await response.json();

        return data;
    }

    /**
     * This returns a promise containing data for casualties.
     */
    getCasualties() {
        let data = JSON.parse(readFileSync(path.join(__dirname, '/data/casualties.json')));
        data.total.wardens = 0; data.total.colonials = 0; data.total.combined = 0;

        const promise = new Promise((resolve) => {
            this.getMaps().then(async (maps) => {
                for (const map of maps) {
                    const etag = Object.hasOwn(data.maps, map.etag) ? data.maps[map].etag : '';
                    const response = await fetch(`${this.rootURL}/worldconquest/warReport/${map}`, { headers: { 'If-None-Match': etag }});
                    if (response.status === 200) {
                        const { wardenCasualties, colonialCasualties } = await response.json();
                    
                        Object.assign(data.maps, { [map]: { wardens: wardenCasualties, colonials: colonialCasualties, etag: response.headers.get('etag') } });
                    }
                }
                for (const [key, value] of Object.entries(data.maps)) {
                    data.total.wardens += value.wardens;
                    data.total.colonials += value.colonials;
                    data.total.combined += value.wardens + value.colonials;
                }

                const stringified = JSON.stringify(data, null, 4);
                writeFileSync(path.join(__dirname, '/data/casualties.json'), stringified);

                resolve(data);
            });
        });

        return promise;
    }
}

module.exports = FoxholeAPI;