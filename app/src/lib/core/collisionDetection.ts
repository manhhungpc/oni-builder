import type { IBuilding, Position } from '@shared/src/interface';
import type { PlacedBuildings } from 'src/interface';
import { calculateBuildingGridPositions } from './positionBuilding';
import type { NodeData } from 'src/interface/building';
import type { SvelteMap } from 'svelte/reactivity';

interface CollisionCheckParams {
    gridX: number;
    gridY: number;
    currentBuilding?: IBuilding;
    placedBuildings?: PlacedBuildings[];
    connectionList?: SvelteMap<string, NodeData>;
}

interface BoundingBox {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

function doBoxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
    const noOverlap =
        box1.right < box2.left ||
        box2.right < box1.left ||
        box1.bottom < box2.top ||
        box2.bottom < box1.top;

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

    if (!placedBuildings || !currentBuilding) return false;

    // Calculate grid positions for the current building
    const currentBuildingPositions = calculateBuildingGridPositions(currentBuilding, gridX, gridY);
    const currentBox = worldPositionsToBoundingBox(
        currentBuildingPositions.topLeft,
        currentBuildingPositions.bottomRight
    );

    // Check against all placed buildings (which also store grid positions)
    for (const placedBuilding of placedBuildings) {
        const placedBox = worldPositionsToBoundingBox(
            placedBuilding.top_left,
            placedBuilding.bottom_right
        );

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

    if (!placedBuildings || !currentBuilding) return [];

    // Calculate grid positions for the current building
    const currentBuildingPositions = calculateBuildingGridPositions(currentBuilding, gridX, gridY);
    const currentBox = worldPositionsToBoundingBox(
        currentBuildingPositions.topLeft,
        currentBuildingPositions.bottomRight
    );

    // Check against all placed buildings (which also store grid positions)
    for (const placedBuilding of placedBuildings) {
        const placedBox = worldPositionsToBoundingBox(
            placedBuilding.top_left,
            placedBuilding.bottom_right
        );

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
export function isGridPositionOccupied(
    x: number,
    y: number,
    placedBuildings: PlacedBuildings[]
): boolean {
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

export function getCollidingConduit(params: CollisionCheckParams): string[] {
    const { connectionList, gridX, gridY } = params;
    const collidingBuildings: string[] = [];

    if (!connectionList) return collidingBuildings;

    // Create the key for the current position
    const currentKey = `${gridX},${gridY}`;

    // Check if this position exists in the connectionList
    if (connectionList.has(currentKey)) {
        const nodeData = connectionList.get(currentKey);
        if (nodeData?.metadata.displayName) {
            collidingBuildings.push(nodeData.metadata.displayName);
        }
    }

    return collidingBuildings;
}
