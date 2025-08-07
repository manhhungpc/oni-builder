const LOGIC_PORT_TYPE = {
    INPUT: 6,
    OUTPUT: 7,
};

function extractAdditionalBuildingData(extraBuildingData) {
    if (!extraBuildingData || !extraBuildingData.buildings) {
        return [];
    }

    const extractedData = extraBuildingData.buildings.map((building) => ({
        prefabId: building.prefabId,
        utilities: building.utilities || [],
        viewMode: building.viewMode,
    }));

    return extractedData;
}

function extractLogicPortData(utilities) {
    if (!utilities || !Array.isArray(utilities)) {
        return [];
    }

    const logicPorts = [];

    utilities.forEach((utility) => {
        if (utility.type === LOGIC_PORT_TYPE.INPUT) {
            logicPorts.push({
                type: 'input',
                offset: {
                    x: utility.offset.x,
                    y: utility.offset.y,
                },
            });
        } else if (utility.type === LOGIC_PORT_TYPE.OUTPUT) {
            logicPorts.push({
                type: 'output',
                offset: {
                    x: utility.offset.x,
                    y: utility.offset.y,
                },
            });
        }
    });

    return logicPorts;
}

module.exports = {
    extractAdditionalBuildingData,
    extractLogicPortData,
};
