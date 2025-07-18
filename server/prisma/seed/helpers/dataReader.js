const fs = require('fs');
const path = require('path');

class DataReader {
    constructor() {
        this.data = {};
        this.projectRoot = path.join(__dirname, '../../../..');
    }

    loadData() {
        const dataFiles = {
            building: 'data/database_base/building.json',
            uvSprite: 'data/database_base/uvSprite.json',
            uiSpriteInfo: 'data/database_base/uiSpriteInfo.json',
            // tags: "data/database_base/tags.json",
            // items: "data/database_base/items.json",
            // db: "data/database_base/db.json",
            // poString: "data/database_base/po_string.json"
        };

        for (const [key, filePath] of Object.entries(dataFiles)) {
            try {
                const fullPath = path.join(this.projectRoot, filePath);
                if (fs.existsSync(fullPath)) {
                    this.data[key] = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    console.log(`Loaded ${key} data`);
                }
            } catch (error) {
                console.error(`Error loading ${key}:`, error.message);
            }
        }
    }

    get building() {
        return this.data.building;
    }

    get uvSprite() {
        return this.data.uvSprite;
    }

    get uiSpriteInfo() {
        return this.data.uiSpriteInfo;
    }

    // Get building definitions
    get buildingDefs() {
        return this.data.building?.buildingDefs || [];
    }

    // Get building categories
    get buildingCategories() {
        return this.data.building?.buildingAndSubcategoryDataPairs || {};
    }
}

// Create singleton instance
const dataReader = new DataReader();

module.exports = dataReader;
