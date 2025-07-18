import type { IBuilding, Position } from '@shared/src/interface';
import type { PlacedBuildings } from 'src/interface';
import { calculateBuildingGridPositions } from './positionBuilding';

interface CollisionCheckParams {
    placedBuildings: PlacedBuildings[];
    currentBuilding: IBuilding;
    gridX: number;
    gridY: number;
}

interface BoundingBox {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

function doBoxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
    const noOverlap =
        box1.right < box2.left || box2.right < box1.left || box1.bottom < box2.top || box2.bottom < box1.top;

    return !noOverlap;
}

function worldPositionsToBoundingBox(topLeft: Position, bottomRight: Position): BoundingBox {
    return {
        left: topLeft.x,
        right: bottomRight.x,
        top: topLeft.y,
        bottom: bottomRight.y,
    };
}

/**
 * Check if a building placement would collide with any existing buildings
 * @returns true if there is a collision, false if placement is valid
 */
export function checkBuildingCollision(params: CollisionCheckParams): boolean {
    const { placedBuildings, currentBuilding, gridX, gridY } = params;

    // Calculate grid positions for the current building
    const currentBuildingPositions = calculateBuildingGridPositions(currentBuilding, gridX, gridY);
    const currentBox = worldPositionsToBoundingBox(
        currentBuildingPositions.topLeft,
        currentBuildingPositions.bottomRight
    );

    // Check against all placed buildings (which also store grid positions)
    for (const placedBuilding of placedBuildings) {
        const placedBox = worldPositionsToBoundingBox(placedBuilding.top_left, placedBuilding.bottom_right);

        if (doBoxesOverlap(currentBox, placedBox)) {
            return true; // Collision detected
        }
    }

    return false; // No collision
}

/**
 * Get all buildings that would collide with the current building placement
 * @returns Array of buildings that collide with the current placement
 */
export function getCollidingBuildings(params: CollisionCheckParams): PlacedBuildings[] {
    const { placedBuildings, currentBuilding, gridX, gridY } = params;
    const collidingBuildings: PlacedBuildings[] = [];

    // Calculate grid positions for the current building
    const currentBuildingPositions = calculateBuildingGridPositions(currentBuilding, gridX, gridY);
    const currentBox = worldPositionsToBoundingBox(
        currentBuildingPositions.topLeft,
        currentBuildingPositions.bottomRight
    );

    // Check against all placed buildings (which also store grid positions)
    for (const placedBuilding of placedBuildings) {
        const placedBox = worldPositionsToBoundingBox(placedBuilding.top_left, placedBuilding.bottom_right);

        if (doBoxesOverlap(currentBox, placedBox)) {
            collidingBuildings.push(placedBuilding);
        }
    }

    return collidingBuildings;
}

/**
 * Check if a specific grid position is occupied by any building
 * @param x Grid X coordinate
 * @param y Grid Y coordinate
 * @returns true if the position is occupied, false otherwise
 */
export function isGridPositionOccupied(x: number, y: number, placedBuildings: PlacedBuildings[]): boolean {
    for (const building of placedBuildings) {
        if (
            x >= building.top_left.x &&
            x < building.bottom_right.x &&
            y >= building.top_left.y &&
            y < building.bottom_right.y
        ) {
            return true;
        }
    }
    return false;
}
