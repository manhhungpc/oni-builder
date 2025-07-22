require('dotenv').config();
const { extractSpriteSheet, getSpriteInfo } = require('./spriteExtractor');
const dataReader = require('./dataReader');

const POWER_PORT_TYPE = {
    generator: 'generator',
    consumer: 'consumer',
    battery: 'battery',
    transformer: 'transformer',
};

async function processBuildingData(buildingData, categoryData) {
    const materials = [];

    if (buildingData.CraftRecipe && buildingData.CraftRecipe.Ingredients) {
        buildingData.CraftRecipe.Ingredients.forEach((ingredient) => {
            materials.push({
                name: ingredient.tag.Name,
                amount: ingredient.amount,
            });
        });
    }

    const conduit = getConduitData(buildingData);

    const logic_port = getLogicPortData(buildingData);

    const power_port = getPowerPortData(buildingData);

    const { category, type } = getBuildingCategory(categoryData, buildingData.PrefabID);

    const textureData = getSpriteInfo(buildingData.PrefabID, dataReader.uiSpriteInfo) ?? '';

    let special_texture = [];

    if (type === 'pipes' || type === 'wires') {
        special_texture = await extractSpriteSheet(textureData.textureName, dataReader.uvSprite);
    }

    return {
        name: buildingData.PrefabID || buildingData.name,
        display_name: getDisplayName(buildingData.Name),
        display_image: process.env.IMAGE_PATH + buildingData.PrefabID + '.png',
        texture_name: textureData.textureName,
        special_texture,
        width: buildingData.WidthInCells,
        height: buildingData.HeightInCells,
        placement_offset: buildingData.PlacementOffsets,
        scene_layer: buildingData.SceneLayer,
        object_layer: buildingData.ObjectLayer,
        tile_layer: buildingData.TileLayer,
        search_term: buildingData.SearchTerms,
        is_drag_build: buildingData.DragBuild,
        is_need_foundation: buildingData.ContinuouslyCheckFoundation,
        is_foundation: buildingData.IsFoundation,
        conduit,
        logic_port,
        power_port,
        materials,
        category,
        type,
    };
}

function getDisplayName(nameString) {
    if (!nameString) return '';
    // Remove HTML-like tags and extract the display name
    const match = nameString.match(/>([^<]+)</);
    return match ? match[1] : nameString;
}

function getConduitData(buildingData) {
    let conduit = null;
    if (
        buildingData.InputConduitType !== undefined ||
        buildingData.OutputConduitType !== undefined
    ) {
        conduit = {
            input_type: buildingData.InputConduitType,
            input_offset: buildingData.UtilityInputOffset
                ? {
                      x: buildingData.UtilityInputOffset.x,
                      y: buildingData.UtilityInputOffset.y,
                  }
                : null,
            output_type: buildingData.OutputConduitType,
            output_offset: buildingData.UtilityOutputOffset
                ? {
                      x: buildingData.UtilityOutputOffset.x,
                      y: buildingData.UtilityOutputOffset.y,
                  }
                : null,
        };
    }

    return conduit;
}

function getLogicPortData(buildingData) {
    let logic_port = null;
    if (buildingData.LogicInputPorts && buildingData.LogicInputPorts.length > 0) {
        const logicInput = buildingData.LogicInputPorts;
        const logicOutput = buildingData.LogicOutputPorts;
        logic_port = {
            input_offset: logicInput
                ? {
                      x: logicInput[0].cellOffset.x,
                      y: logicInput[0].cellOffset.y,
                  }
                : null,
            output_offset: logicOutput
                ? {
                      x: logicOutput[0].cellOffset.x,
                      y: logicOutput[0].cellOffset.y,
                  }
                : null,
        };
    }

    return logic_port;
}

function getPowerPortData(buildingData) {
    if (buildingData.RequiresPowerInput && buildingData.RequiresPowerOutput) {
        return {
            type: POWER_PORT_TYPE.transformer,
            consume_amount: buildingData.GeneratorWattageRating,
            generate_amount: null,
            input_offset: {
                x: buildingData.PowerInputOffset.x,
                y: buildingData.PowerInputOffset.y,
            },
            output_offset: {
                x: buildingData.PowerOutputOffset.x,
                y: buildingData.PowerOutputOffset.y,
            },
        };
    }

    if (buildingData.RequiresPowerInput && buildingData.EnergyConsumptionWhenActive > 0) {
        return {
            type: POWER_PORT_TYPE.consumer,
            consume_amount: buildingData.EnergyConsumptionWhenActive,
            generate_amount: null,
            input_offset: {
                x: buildingData.PowerInputOffset.x,
                y: buildingData.PowerInputOffset.y,
            },
            output_offset: null,
        };
    }

    if (buildingData.RequiresPowerOutput && buildingData.GeneratorWattageRating > 0) {
        return {
            type: POWER_PORT_TYPE.generator,
            consume_amount: null,
            generate_amount: buildingData.GeneratorWattageRating,
            input_offset: null,
            output_offset: {
                x: buildingData.PowerOutputOffset.x,
                y: buildingData.PowerOutputOffset.y,
            },
        };
    }

    if (buildingData.RequiresPowerOutput && buildingData.UseWhitePowerOutputConnectorColour) {
        return {
            type: POWER_PORT_TYPE.battery,
            consume_amount: null,
            generate_amount: null,
            input_offset: null,
            output_offset: {
                x: buildingData.PowerOutputOffset.x,
                y: buildingData.PowerOutputOffset.y,
            },
        };
    }

    return null;
}

function getBuildingCategory(data, buildingIdName) {
    const lookup = {};
    for (const [category, items] of Object.entries(data)) {
        for (const item of items) {
            lookup[item.Key] = {
                category: category,
                type: item.Value,
            };
        }
    }

    return lookup[buildingIdName] || { category: null, type: null };
}

module.exports = {
    processBuildingData,
};
