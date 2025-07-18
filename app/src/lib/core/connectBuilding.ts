import { Container, FederatedPointerEvent, Graphics, Sprite } from 'pixi.js';
import { addConnection } from 'src/lib/helpers/gridAdjacency';
import { worldToGrid, gridToWorld } from 'src/lib/helpers/gridTransform';
import type { Position } from '@shared/src/interface';
import type { Camera } from 'src/utils/camera';
import type { SvelteMap } from 'svelte/reactivity';
import { CELL_SIZE, MOUSE_CLICK } from 'src/lib/constant';
import type { DragDrawHandlers } from 'src/interface/building';

// Drag between 2 grid - connect it using functions in gridAdjacency.ts
function dragDrawBuilding(
    container: Container,
    camera: Camera,
    connectionList: SvelteMap<string, string[]>,
    options?: {
        onConnect?: (from: Position, to: Position) => void;
    }
): DragDrawHandlers {
    let isDragging = false;
    let startGrid: Position | null = null;
    let debug_dragLine: Graphics | null = null;

    const startDrag = (event: FederatedPointerEvent) => {
        if (event.button !== MOUSE_CLICK.LEFT) return;

        const worldPos = camera.screenToWorld(event.global.x, event.global.y);
        const { gridX, gridY } = worldToGrid(worldPos);

        startGrid = { x: gridX, y: gridY };
        isDragging = true;

        // Create drag line visual
        debug_dragLine = new Graphics();
        debug_dragLine.zIndex = 555;

        container.addChild(debug_dragLine);
    };

    const moveDrag = (event: FederatedPointerEvent) => {
        if (!isDragging || !startGrid) return;

        const worldPos = camera.screenToWorld(event.global.x, event.global.y);
        const { gridX, gridY } = worldToGrid(worldPos);

        const startPos = gridToWorld(startGrid.x, startGrid.y);
        const endPos = gridToWorld(gridX, gridY);

        if (startPos.x != endPos.x && startPos.y! + endPos.y) {
            // TODO: Handle when user drag in diagonal line, not adjacency line
        }

        if (debug_dragLine) {
            // Draw from center of start grid to center of current grid
            debug_dragLine.setStrokeStyle({
                width: 4,
                color: '#008000',
            });
            debug_dragLine.moveTo(startPos.x + CELL_SIZE / 2, startPos.y + CELL_SIZE / 2);
            debug_dragLine.lineTo(endPos.x + CELL_SIZE / 2, endPos.y + CELL_SIZE / 2);
            debug_dragLine.stroke();
        }

        const endGridPosition = worldToGrid(endPos);
        const endGrid = { x: endGridPosition.gridX, y: endGridPosition.gridY };
        if (startGrid.x !== endGrid.x || startGrid.y !== endGrid.y) {
            addConnection(connectionList, startGrid, endGrid);
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

// Update texture of grid drag from, grid drag to
function updateConnectionTextures() {}

// Helper function to update a single grid's texture based on its connections
function updateGridTexture(
    container: Container,
    gridPos: Position,
    connectionList: SvelteMap<string, string[]>,
    textureMap: Map<string, string>
): void {
    const key = `${gridPos.x},${gridPos.y}`;
    const connections = connectionList.get(key);

    if (!connections || connections.length === 0) return;

    // Calculate connection pattern
    const pattern = calculateConnectionPattern(gridPos, connections);

    // Get texture name from pattern
    const textureName = textureMap.get(pattern);
    if (!textureName) return;

    // Find sprite at this grid position
    const worldPos = gridToWorld(gridPos.x, gridPos.y);
    const sprites = container.children.filter(
        (child) =>
            child instanceof Sprite &&
            Math.abs(child.x - worldPos.x) < 1 &&
            Math.abs(child.y - worldPos.y) < 1
    ) as Sprite[];

    // Update texture for each sprite found at this position
    sprites.forEach((sprite) => {
        sprite.texture = Sprite.from(textureName).texture;
    });
}

// Calculate connection pattern as a string in LRUD order (e.g., "L", "LR", "LU", "LRUD")
function calculateConnectionPattern(gridPos: Position, connections: string[]): string {
    let hasLeft = false;
    let hasRight = false;
    let hasUp = false;
    let hasDown = false;

    connections.forEach((connectionKey) => {
        const [x, y] = connectionKey.split(',').map(Number);
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

    return pattern;
}

export { dragDrawBuilding };
