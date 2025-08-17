import type { IBuilding, Position } from '@shared/src/interface';
import type { Camera } from 'src/utils/camera';
import { FederatedPointerEvent, Sprite, Container, Assets } from 'pixi.js';
import { CELL_SIZE, PORT } from 'src/lib/constant';
import type { PlacementState, PreviewState } from 'src/interface/building';
import { getCollidingBuildings } from './collisionDetection';
import { globalState, message, placedBuildings } from 'src/lib/universal/globalState.svelte';
import { worldToGrid } from 'src/lib/helpers/gridTransform';
import { getPortSpriteAlias } from 'src/lib/utils';
import { positionPort, type PortHandler } from './drawBuilding';
import { OVERLAY } from '@shared/src/enum';

// Create mouse move handler for building preview with grid snapping
function previewBuilding(
    sprite: Sprite,
    currentBuilding: IBuilding,
    camera: Camera,
    offset: Position
): PreviewState {
    // Create a parent container to hold both the sprite and port container
    const previewContainer = new Container();
    previewContainer.label = 'Building Preview';
    const portContainer = new Container();
    portContainer.label = 'Port Preview';

    if (sprite.parent) {
        sprite.parent.addChild(previewContainer);
    }
    previewContainer.addChild(sprite);
    previewContainer.addChild(portContainer);

    const currentOverlay = globalState.currentOverlays;
    const { portSpriteInput, portSpriteOutput } = getPortSpriteAlias(currentOverlay);

    // First, collect all port positions using positionPort
    const portPositions: Array<{ x: number; y: number; type: PORT; category: OVERLAY }> = [];
    const collectPorts: PortHandler = (
        x: number,
        y: number,
        portType: PORT,
        portCategory: OVERLAY
    ) => {
        portPositions.push({ x, y, type: portType, category: portCategory });
    };

    // Calculate port positions relative to building position (0,0)
    positionPort(currentBuilding, 0, 0, collectPorts);

    // Now create sprites for each collected port
    portPositions.forEach((port) => {
        if (port.category != globalState.currentOverlays) {
            return;
        }
        const spriteAlias = port.type === PORT.INPUT ? portSpriteInput : portSpriteOutput;
        if (!spriteAlias) return;

        try {
            const portSprite = Sprite.from(spriteAlias);
            portSprite.width = CELL_SIZE;
            portSprite.height = CELL_SIZE;
            // Ports are relative to building origin, but need to account for building offset
            // Since the container is already offset, we need to subtract the offset from port position
            portSprite.position.set(
                (port.x - offset.x) * CELL_SIZE, 
                (port.y - offset.y) * CELL_SIZE
            );
            portSprite.alpha = 0.7;
            portContainer.addChild(portSprite);
        } catch (error) {
            console.warn(`Port sprite ${spriteAlias} not loaded yet`);
        }
    });

    const previewHandler = gridSnapPreviewHandler(
        previewContainer,
        camera,
        offset,
        currentBuilding
    );

    return {
        previewContainer: previewContainer,
        mouseMoveHandler: previewHandler,
    };
}

function gridSnapPreviewHandler(
    container: Container,
    camera: Camera,
    offset: Position,
    currentBuilding: IBuilding
): (event: FederatedPointerEvent) => void {
    return (event: FederatedPointerEvent) => {
        const worldPos = camera.screenToWorld(event.global.x, event.global.y);

        // Snap to grid
        const { gridX, gridY } = worldToGrid(worldPos);

        container.position.set((gridX + offset.x) * CELL_SIZE, (gridY + offset.y) * CELL_SIZE);
        container.zIndex = 999;

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
