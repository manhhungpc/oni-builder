function mapConduitType(type) {
    const conduitTypeMap = {
        0: 0, // None
        1: 1, // Gas
        2: 2, // Liquid
        3: 3, // Solid
        4: 4, // Electrical
    };
    return conduitTypeMap[type] || null;
}

module.exports = {
    mapConduitType,
};
