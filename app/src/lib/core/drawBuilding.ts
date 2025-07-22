import type { IBuilding } from '@shared/src/interface';
import type { Camera } from 'src/utils/camera';
import { Container, FederatedPointerEvent, Sprite, Application, Graphics } from 'pixi.js';
import { CELL_SIZE, MOUSE_CLICK } from 'src/lib/constant';
import type { PlacementState } from 'src/interface/building';
import {
    calculateBuildingGridPositions,
    calculateBuildingOffset,
} from 'src/lib/core/positionBuilding';
import { globalState, placedBuildings, gridPosition } from 'src/lib/universal/globalState.svelte';
import { worldToGrid } from 'src/lib/helpers/gridTransform';

// Initialize building draw on canvas
function drawBuilding(
    sprite: Sprite,
    building: IBuilding,
    container: Container,
    camera: Camera,
    options?: {
        onPlace?: (gridX: number, gridY: number) => void;
        onCancel?: () => void;
    }
): PlacementState {
    const clickHandler = placeOnGridHandler(building, camera, container, {
        onPlace: options?.onPlace,
        onCancel: options?.onCancel,
    });

    return {
        sprite,
        clickHandler,
    };
}

function placeOnGridHandler(
    buildingData: IBuilding,
    camera: Camera,
    container: Container,
    options: {
        onPlace?: (gridX: number, gridY: number) => void;
        onCancel?: () => void;
    }
): (event: FederatedPointerEvent) => void {
    return (event: FederatedPointerEvent) => {
        const offset = calculateBuildingOffset(buildingData);

        if (event.button === MOUSE_CLICK.LEFT) {
            // Check if placement is valid
            if (!globalState.isValidPlacement) {
                return;
            }
            const worldPos = camera.screenToWorld(event.global.x, event.global.y);
            const { gridX, gridY } = worldToGrid(worldPos);

            // Create permanent building
            let buildingSprite = Sprite.from(buildingData.name);
            buildingSprite.position.set(
                (gridX + offset.x) * CELL_SIZE,
                (gridY + offset.y) * CELL_SIZE
            );
            buildingSprite.width = buildingData.width * CELL_SIZE;
            buildingSprite.height = buildingData.height * CELL_SIZE;
            buildingSprite.zIndex = buildingData.scene_layer;
            container.addChild(buildingSprite);
            const buildingWorldPosition = calculateBuildingGridPositions(
                buildingData,
                gridX,
                gridY
            );

            placedBuildings.push({
                display_name: buildingData.display_name,
                category: buildingData.category || '',
                object_layer: buildingData.object_layer,
                scene_layer: buildingData.scene_layer,
                tile_layer: buildingData.tile_layer,
                top_left: buildingWorldPosition.topLeft,
                bottom_right: buildingWorldPosition.bottomRight,
            });

            options.onPlace?.(gridX, gridY);
        } else if (event.button === MOUSE_CLICK.RIGHT) {
            if (options.onCancel) options.onCancel();
        }
    };
}

export { drawBuilding };
