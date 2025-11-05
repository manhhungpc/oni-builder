import { FederatedPointerEvent, Sprite } from 'pixi.js';
import { addConnection, addNode, removeConnection } from '$lib/utils/grid/adjacency';
import { worldToGrid, gridToWorld } from '$lib/utils/grid/transform';
import type { IBuilding, Position } from 'src/interface/building';
import type { Camera } from '$lib/rendering/camera';
import type { SvelteMap } from 'svelte/reactivity';
import { CELL_SIZE, MOUSE_CLICK, ACTION } from '$lib/constant';
import type { DragDrawHandlers, NodeData } from 'src/interface/building';
import { blueprint } from '$lib/state/blueprint.svelte';
import { appConfig } from '$lib/state/config.svelte';

function dragDrawBuilding(
	camera: Camera,
	connectionList: SvelteMap<string, NodeData>,
	building: Partial<IBuilding> | IBuilding | null,
	options?: {
		onConnect?: (from: Position, to: Position) => void;
		onStartDrag?: (startGrid: Position) => void;
	}
): DragDrawHandlers {
	let isDragging = false;
	let startGrid: Position | null = null;

	function startDrag(event: FederatedPointerEvent) {
		if (event.button !== MOUSE_CLICK.LEFT) return;

		const worldPos = camera.screenToWorld(event.global.x, event.global.y);
		const { gridX, gridY } = worldToGrid(worldPos);

		startGrid = { x: gridX, y: gridY };
		isDragging = true;

		options?.onStartDrag?.(startGrid);

		// addNode(connectionList, startGrid);
		if (building) {
			updateGridTexture(building, startGrid, connectionList);
		}
	}

	function moveDrag(event: FederatedPointerEvent) {
		if (!isDragging || !startGrid) return;

		const worldPos = camera.screenToWorld(event.global.x, event.global.y);
		const { gridX, gridY } = worldToGrid(worldPos);

		const endPos = gridToWorld(gridX, gridY);

		const endGridPosition = worldToGrid(endPos);
		const endGrid = { x: endGridPosition.gridX, y: endGridPosition.gridY };
		if (startGrid.x !== endGrid.x || startGrid.y !== endGrid.y) {
			if (appConfig.selectedAction === ACTION.BUILD) {
				// Add connection when in BUILD mode
				addConnection(connectionList, startGrid, endGrid);
			} else if (appConfig.selectedAction === ACTION.CUT) {
				// Remove connection when in CUT mode
				removeConnection(connectionList, startGrid, endGrid);
			}
			options?.onConnect?.(startGrid, endGrid);
		}

		// End position of the grid dragged to become new starting position
		const newStartingPos = worldToGrid(endPos);
		startGrid = { x: newStartingPos.gridX, y: newStartingPos.gridY };
	}

	function endDrag() {
		if (!isDragging || !startGrid) return;

		// Clean up
		isDragging = false;
		startGrid = null;
	}

	return {
		startDrag,
		moveDrag,
		endDrag
	};
}

function updateGridTexture(
	building: IBuilding | Partial<IBuilding> | null,
	gridPos: Position,
	connectionList: SvelteMap<string, NodeData>
): void {
	const key = `${gridPos.x},${gridPos.y}`;
	const nodeData = connectionList.get(key);

	if (!nodeData) return;

	if (!building?.name || !building?.display_name) {
		throw new Error('Missing required field for update grid texture');
	}

	nodeData.metadata.name = building.name;
	nodeData.metadata.displayName = building.display_name;

	const pattern = calculateConnectPattern(gridPos, nodeData.connects);
	const textureAlias = `${building.name}_${pattern}`;

	if (nodeData.metadata.sprite) {
		const updatedSprite = Sprite.from(textureAlias).texture;
		nodeData.metadata.sprite.texture = updatedSprite;
	} else {
		const newSprite = Sprite.from(textureAlias);

		const worldPos = gridToWorld(gridPos.x, gridPos.y);
		newSprite.x = worldPos.x;
		newSprite.y = worldPos.y;

		const originalTexture = newSprite.texture;

		// Calculate scale to fit within CELL_SIZE boundaries while maintaining aspect ratio
		const scaleX = CELL_SIZE / originalTexture.width;
		const scaleY = CELL_SIZE / originalTexture.height;
		const scale = Math.min(scaleX, scaleY);

		newSprite.width = originalTexture.width * scale;
		newSprite.height = originalTexture.height * scale;
		newSprite.zIndex = building.scene_layer || 1;

		blueprint.buildContainer?.addChild(newSprite);

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

export { dragDrawBuilding, updateGridTexture };
