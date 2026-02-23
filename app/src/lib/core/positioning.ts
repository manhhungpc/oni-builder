import type { IBuilding, Position } from 'src/interface/building';
import type { BuildingBounds } from 'src/interface';

function getBuildingBounds(building: IBuilding): BuildingBounds {
    const { placement_offset } = building;

    if (!placement_offset || placement_offset.length === 0) {
        // Use building dimensions for standard rectangular placement
        return {
            minX: 0,
            maxX: building.width,
            minY: 0,
            maxY: building.height,
        };
    }

    return {
        minX: Math.min(...placement_offset.map((pos) => pos.x)),
        maxX: Math.max(...placement_offset.map((pos) => pos.x)),
        minY: Math.min(...placement_offset.map((pos) => pos.y)),
        maxY: Math.max(...placement_offset.map((pos) => pos.y)),
    };
}

// Offset initial building placement base on "placement_offset"
function calculateBuildingOffset(building: IBuilding): Position {
    const { placement_offset } = building;

    if (!placement_offset || placement_offset.length === 0) {
        return { x: 0, y: 0 };
    }

    // Find the top-left of the building data
    const bound = getBuildingBounds(building);

    // The offset is how much we need to shift from the top-left (0,0) position
    // When drawing sprite, Pixi start draw from top-left, +x is right, but +y is DOWN
    // For normal coordinate system (also the "placement_offset" field), the +x is right, but +y is UP, so we need to reverse y-axis
    return {
        x: bound.minX,
        y: -bound.maxY,
    };
}

// Calulate building bounds when rotating around origin of building (0,0)s
function getRotatingBoundary(bound: BuildingBounds, orientation: number): BuildingBounds {
    switch (orientation) {
        case 90: // (x,y) → (y, -x)
            return { minX: bound.minY, maxX: bound.maxY, minY: -bound.maxX, maxY: -bound.minX };
        case 180: // (x,y) → (-x, -y)
            return { minX: -bound.maxX, maxX: -bound.minX, minY: -bound.maxY, maxY: -bound.minY };
        case 270: // (x,y) → (-y, x)
            return { minX: -bound.maxY, maxX: -bound.minY, minY: bound.minX, maxY: bound.maxX };
        default:
            return bound;
    }
}

// Calculate the world positions for top-left and bottom-right corners of the building
function calculateBuildingGridPositions(
    building: IBuilding,
    gridX: number,
    gridY: number,
    orientation: number = 0,
    rotationPermit: number = 0
): { topLeft: Position; bottomRight: Position } {
    let bound = getBuildingBounds(building);

    if ((rotationPermit === 1 || rotationPermit === 2) && orientation !== 0) {
        bound = getRotatingBoundary(bound, orientation);
    }

    return {
        topLeft: {
            x: gridX + bound.minX,
            y: gridY - bound.maxY,
        },
        bottomRight: {
            x: gridX + bound.maxX,
            y: gridY - bound.minY,
        },
    };
}

function getBuildingOccupiedTiles(building: IBuilding, gridX: number, gridY: number): Position[] {
    const { placement_offset } = building;

    if (!placement_offset || placement_offset.length === 0) {
        // Generate tiles for standard rectangular placement
        const tiles: Position[] = [];
        for (let dx = 0; dx < building.width; dx++) {
            for (let dy = 0; dy < building.height; dy++) {
                tiles.push({
                    x: gridX + dx,
                    y: gridY + dy,
                });
            }
        }
        return tiles;
    }

    // Use placement_offset data, converting coordinate systems
    return placement_offset.map((offset) => ({
        x: gridX + offset.x,
        y: gridY - offset.y, // Flip Y due to coordinate system difference
    }));
}

export { calculateBuildingGridPositions, calculateBuildingOffset, getBuildingOccupiedTiles, getBuildingBounds, getRotatingBoundary };
