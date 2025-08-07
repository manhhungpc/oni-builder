import type { IBuilding, Position } from '@shared/src/interface';
import type { Camera } from 'src/utils/camera';
import { FederatedPointerEvent, Sprite } from 'pixi.js';
import { CELL_SIZE } from 'src/lib/constant';
import type { PlacementState } from 'src/interface/building';
import { checkBuildingCollision, getCollidingBuildings } from './collisionDetection';
import { globalState, message, placedBuildings } from 'src/lib/universal/globalState.svelte';
import { worldToGrid } from 'src/lib/helpers/gridTransform';

// Create mouse move handler for building preview with grid snapping
function previewBuilding(
    sprite: Sprite,
    currentBuilding: IBuilding,
    camera: Camera,
    offset: Position
): PlacementState {
    const previewHandler = gridSnapPreviewHandler(sprite, camera, offset, currentBuilding);

    return {
        sprite,
        mouseMoveHandler: previewHandler,
    };
}

function gridSnapPreviewHandler(
    sprite: Sprite,
    camera: Camera,
    offset: Position,
    currentBuilding: IBuilding
): (event: FederatedPointerEvent) => void {
    return (event: FederatedPointerEvent) => {
        const worldPos = camera.screenToWorld(event.global.x, event.global.y);

        // Snap to grid
        const { gridX, gridY } = worldToGrid(worldPos);

        sprite.position.set((gridX + offset.x) * CELL_SIZE, (gridY + offset.y) * CELL_SIZE);
        sprite.zIndex = 999;

        // Check for collision
        const collideBuildings = getCollidingBuildings({
            placedBuildings,
            currentBuilding,
            gridX: gridX,
            gridY: gridY,
        });

        const collideBuildingLayers = new Set(
            collideBuildings.map((building) => building.object_layer)
        );

        const invalidPlacement =
            collideBuildings.length && collideBuildingLayers.has(currentBuilding.object_layer);

        if (invalidPlacement) {
            message.popup = collideBuildings
                .filter((building) => building.object_layer === currentBuilding.object_layer)
                .map((building) => building.display_name)
                .join(', ');
            globalState.isValidPlacement = false;
        } else {
            message.popup = '';
            globalState.isValidPlacement = true;
        }
    };
}

export { previewBuilding };
