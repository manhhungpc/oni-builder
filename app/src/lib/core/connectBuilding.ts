import { FederatedPointerEvent, Sprite } from 'pixi.js';
import { addConnection } from 'src/lib/helpers/gridAdjacency';
import { worldToGrid, gridToWorld } from 'src/lib/helpers/gridTransform';
import type { IBuilding, Position } from '@shared/src/interface';
import type { Camera } from 'src/utils/camera';
import type { SvelteMap } from 'svelte/reactivity';
import { CELL_SIZE, MOUSE_CLICK } from 'src/lib/constant';
import type { DragDrawHandlers, NodeData } from 'src/interface/building';
import { globalState } from 'src/lib/universal/globalState.svelte';

function dragDrawBuilding(
    camera: Camera,
    connectionList: SvelteMap<string, NodeData>,
    building: IBuilding,
    options?: {
        onConnect?: (from: Position, to: Position) => void;
    }
): DragDrawHandlers {
    let isDragging = false;
    let startGrid: Position | null = null;

    const startDrag = (event: FederatedPointerEvent) => {
        if (event.button !== MOUSE_CLICK.LEFT) return;

        const worldPos = camera.screenToWorld(event.global.x, event.global.y);
        const { gridX, gridY } = worldToGrid(worldPos);

        startGrid = { x: gridX, y: gridY };
        isDragging = true;
    };

    const moveDrag = (event: FederatedPointerEvent) => {
        if (!isDragging || !startGrid) return;

        const worldPos = camera.screenToWorld(event.global.x, event.global.y);
        const { gridX, gridY } = worldToGrid(worldPos);

        const endPos = gridToWorld(gridX, gridY);

        const endGridPosition = worldToGrid(endPos);
        const endGrid = { x: endGridPosition.gridX, y: endGridPosition.gridY };
        if (startGrid.x !== endGrid.x || startGrid.y !== endGrid.y) {
            addConnection(connectionList, startGrid, endGrid);

            // Update textures for both grids
            updateGridTexture(building, startGrid, connectionList);
            updateGridTexture(building, endGrid, connectionList);
        }

        // End position of the grid dragged to become new starting position
        const newStartingPos = worldToGrid(endPos);
        startGrid = { x: newStartingPos.gridX, y: newStartingPos.gridY };
    };

    const endDrag = (event: FederatedPointerEvent) => {
        if (!isDragging || !startGrid) return;

        const worldPos = camera.screenToWorld(event.global.x, event.global.y);
        const { gridX, gridY } = worldToGrid(worldPos);
        const endGrid = { x: gridX, y: gridY };

        // Don't connect to the same grid. Do we need this?
        if (startGrid.x !== endGrid.x || startGrid.y !== endGrid.y) {
            addConnection(connectionList, startGrid, endGrid);

            options?.onConnect?.(startGrid, endGrid);
        }

        // Clean up
        isDragging = false;
        startGrid = null;
    };

    const cancelDrag = () => {
        isDragging = false;
        startGrid = null;
    };

    return {
        startDrag,
        moveDrag,
        endDrag,
        cancelDrag,
    };
}

function updateGridTexture(
    building: IBuilding,
    gridPos: Position,
    connectionList: SvelteMap<string, NodeData>
): void {
    const key = `${gridPos.x},${gridPos.y}`;
    const nodeData = connectionList.get(key);

    if (!nodeData || nodeData.list.length === 0) return;

    nodeData.metadata.displayName = building.display_image;

    const pattern = calculateConnectPattern(gridPos, nodeData.list);
    const textureAlias = `${building.name}_${pattern}`;

    if (nodeData.metadata.sprite) {
        const updatedSprite = Sprite.from(textureAlias).texture;
        nodeData.metadata.sprite.texture = updatedSprite;
    } else {
        const newSprite = Sprite.from(textureAlias);

        const worldPos = gridToWorld(gridPos.x, gridPos.y);
        newSprite.x = worldPos.x;
        newSprite.y = worldPos.y;

        // Size the sprite to match the grid cell
        newSprite.width = building.width * CELL_SIZE;
        newSprite.height = building.height * CELL_SIZE;

        globalState.buildContainer?.addChild(newSprite);

        nodeData.metadata.sprite = newSprite;
    }
}

// Calculate connection pattern as a string in LRUD order (e.g., "L", "LR", "LU", "LRUD")
function calculateConnectPattern(gridPos: Position, connections: string[]): string {
    let hasLeft = false;
    let hasRight = false;
    let hasUp = false;
    let hasDown = false;

    connections.forEach((value) => {
        const [x, y] = value.split(',').map(Number);
        const dx = x - gridPos.x;
        const dy = y - gridPos.y;

        if (dx < 0) hasLeft = true;
        else if (dx > 0) hasRight = true;

        if (dy < 0) hasUp = true;
        else if (dy > 0) hasDown = true;
    });

    // Build pattern in LRUD order
    let pattern = '';
    if (hasLeft) pattern += 'L';
    if (hasRight) pattern += 'R';
    if (hasUp) pattern += 'U';
    if (hasDown) pattern += 'D';

    if (pattern == '') pattern = 'None';

    return pattern;
}

export { dragDrawBuilding };
