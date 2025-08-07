import type { IBuilding, Position } from '@shared/src/interface';
import type { Camera } from 'src/utils/camera';
import { Container, FederatedPointerEvent, Sprite, Application } from 'pixi.js';
import { CELL_SIZE } from 'src/lib/constant';
import { createPlacementSprite } from 'src/utils/pixi';
import type { PlacementState } from 'src/interface/building';
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

// Calculate the world positions for top-left and bottom-right corners of the building
function calculateBuildingGridPositions(
    building: IBuilding,
    gridX: number,
    gridY: number
): { topLeft: Position; bottomRight: Position } {
    const bound = getBuildingBounds(building);

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

export { calculateBuildingGridPositions, calculateBuildingOffset, getBuildingOccupiedTiles };
