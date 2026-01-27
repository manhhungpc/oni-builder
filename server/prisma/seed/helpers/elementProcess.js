function getElementType(element) {
    if (element.IsLiquid) return 'liquid';
    if (element.IsGas) return 'gas';
    if (element.IsSolid) return 'solid';
    if (element.IsVacuum) return 'vacuum';
    return null;
}

function formatColour(colourObj) {
    if (!colourObj) return null;
    return `${colourObj.r},${colourObj.g},${colourObj.b},${colourObj.a}`;
}

function processElementData(elementData) {
    const name = elementData.substance?.name;
    const texture = elementData.substance?.anim?.textureList?.[0]?.name;
    const type = getElementType(elementData);
    const colour = formatColour(elementData.substance?.colour);
    const uiColour = formatColour(elementData.substance?.uiColour);
    const conduitColour = formatColour(elementData.substance?.conduitColour);

    if (!name || !texture || !type) {
        return null;
    }

    return {
        name,
        texture,
        type,
        colour,
        uiColour,
        conduitColour,
    };
}

module.exports = {
    processElementData,
};
