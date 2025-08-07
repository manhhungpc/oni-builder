require('dotenv').config();
const { extractSpriteSheet, getSpriteInfo } = require('./spriteExtractor');
const dataReader = require('./dataReader');
const { extractAdditionalBuildingData, extractLogicPortData } = require('./extraDataExtractor');

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

    let logic_port = getLogicPortData(buildingData);

    const power_port = getPowerPortData(buildingData);

    const { category, type } = getBuildingCategory(categoryData, buildingData.PrefabID);

    const textureData = getSpriteInfo(buildingData.PrefabID, dataReader.uiSpriteInfo) ?? '';
    const extraBuildingData = dataReader.building_2020;

    const { extraData, extraLogicPorts } = getAdditionalBuildingData(
        extraBuildingData,
        buildingData.PrefabID,
        logic_port
    );

    // Update logic_port if we have extra data
    if (extraLogicPorts) {
        logic_port = extraLogicPorts;
    }

    let special_texture = [];

    if (type === 'pipes' || type === 'wires' || buildingData.name == 'SolidConduit') {
        special_texture = await extractSpriteSheet(textureData.textureName, dataReader.uvSprite);
    }

    return {
        name: buildingData.PrefabID || buildingData.name,
        display_name: getDisplayName(buildingData.Name),
        display_image: process.env.UI_IMAGE_PATH + buildingData.PrefabID + '.png',
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
        view_mode: extraData.view_mode,
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
        const inputOffset =
            buildingData.InputConduitType === 0 || !buildingData.UtilityInputOffset
                ? null
                : {
                      x: buildingData.UtilityInputOffset.x,
                      y: buildingData.UtilityInputOffset.y,
                  };
        const outputOffset =
            buildingData.OutputConduitType === 0 || !buildingData.UtilityOutputOffset
                ? null
                : {
                      x: buildingData.UtilityOutputOffset.x,
                      y: buildingData.UtilityOutputOffset.y,
                  };
        conduit = {
            input_type: buildingData.InputConduitType === 0 ? null : buildingData.InputConduitType,
            input_offset: inputOffset,
            output_type:
                buildingData.OutputConduitType === 0 ? null : buildingData.OutputConduitType,
            output_offset: outputOffset,
        };
    }

    return conduit;
}

function getLogicPortData(buildingData) {
    let logic_port = [];

    if (buildingData.LogicInputPorts && buildingData.LogicInputPorts.length > 0) {
        buildingData.LogicInputPorts.forEach((port) => {
            logic_port.push({
                type: 'input',
                offset: {
                    x: port.cellOffset.x,
                    y: port.cellOffset.y,
                },
            });
        });
    }

    if (buildingData.LogicOutputPorts && buildingData.LogicOutputPorts.length > 0) {
        buildingData.LogicOutputPorts.forEach((port) => {
            logic_port.push({
                type: 'output',
                offset: {
                    x: port.cellOffset.x,
                    y: port.cellOffset.y,
                },
            });
        });
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

function getAdditionalBuildingData(extraBuildingData, prefabId, currentLogicPorts) {
    let extraData = {};
    let extraLogicPorts = currentLogicPorts;

    if (!extraBuildingData) {
        return { extraData, extraLogicPorts };
    }

    const extractedData = extractAdditionalBuildingData(extraBuildingData);
    const matchingBuilding = extractedData.find((b) => b.prefabId === prefabId);

    if (!matchingBuilding) {
        return { extraData, extraLogicPorts };
    }

    // Extract additional logic ports from utilities
    const additionalLogicPorts = extractLogicPortData(matchingBuilding.utilities);

    // Merge logic ports if we have additional ones
    if (additionalLogicPorts.length > 0) {
        if (!currentLogicPorts || currentLogicPorts.length === 0) {
            extraLogicPorts = additionalLogicPorts;
        } else {
            // Helper function to check if port already exists (comparing integer parts only)
            const portExists = (existingPorts, newPort) => {
                return existingPorts.some(
                    (port) =>
                        port.type === newPort.type &&
                        Math.floor(port.offset.x) === Math.floor(newPort.offset.x) &&
                        Math.floor(port.offset.y) === Math.floor(newPort.offset.y)
                );
            };

            // Create a new array with existing ports
            extraLogicPorts = [...currentLogicPorts];

            // Only add ports that don't already exist
            additionalLogicPorts.forEach((additionalPort) => {
                if (!portExists(extraLogicPorts, additionalPort)) {
                    extraLogicPorts.push(additionalPort);
                }
            });
        }
    }

    extraData = {
        view_mode: matchingBuilding.viewMode,
    };

    return { extraData, extraLogicPorts };
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
