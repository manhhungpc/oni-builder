import { FederatedPointerEvent, Sprite } from 'pixi.js';
import { worldToGrid, gridToWorld } from '$lib/utils/grid/transform';
import type { IBuilding, Position, GridNodeData } from 'src/interface/building';
import { CELL_SIZE, MOUSE_CLICK, ACTION } from '$lib/constant';
import type { DragDrawHandlers } from 'src/interface/building';
import { blueprint } from '$lib/state/blueprint.svelte';
import { appConfig } from '$lib/state/config.svelte';
import { getTileList } from 'src/lib/utils/helpers';
import type { SvelteMap } from 'svelte/reactivity';

// Direction offsets for 4-adjacent neighbors (Left, Right, Up, Down)
const ADJACENT_OFFSETS: Position[] = [
	{ x: -1, y: 0 }, // Left
	{ x: 1, y: 0 }, // Right
	{ x: 0, y: -1 }, // Up
	{ x: 0, y: 1 } // Down
];

function clickPlaceTile(
	building: Partial<IBuilding> | IBuilding | null,
	options?: {
		onPlace?: (gridPos: Position) => void;
	}
): DragDrawHandlers {
	const tileList = getTileList();

	function startDrag(event: FederatedPointerEvent) {
		if (event.button !== MOUSE_CLICK.LEFT || !blueprint.camera) {
			console.error('Error when placing tile');
			return;
		}

		const worldPos = blueprint.camera.screenToWorld(event.global.x, event.global.y);
		const { gridX, gridY } = worldToGrid(worldPos);
		const gridPos = { x: gridX, y: gridY };

		if (appConfig.selectedAction === ACTION.BUILD && building) {
			placeTile(building, gridPos, tileList);
			options?.onPlace?.(gridPos);
		} else if (appConfig.selectedAction === ACTION.CUT) {
			removeTile(gridPos, tileList);
		}
	}

	function moveDrag(event: FederatedPointerEvent) {
		// Tiles can also be drag-placed (painting mode)
		if (event.buttons !== 1 || !blueprint.camera) {
			return;
		}

		const worldPos = blueprint.camera.screenToWorld(event.global.x, event.global.y);
		const { gridX, gridY } = worldToGrid(worldPos);
		const gridPos = { x: gridX, y: gridY };

		if (appConfig.selectedAction === ACTION.BUILD && building) {
			// Only place if not already placed at this position
			const key = `${gridPos.x},${gridPos.y}`;
			if (!tileList.has(key)) {
				placeTile(building, gridPos, tileList);
				options?.onPlace?.(gridPos);
			}
		} else if (appConfig.selectedAction === ACTION.CUT) {
			removeTile(gridPos, tileList);
		}
	}

	function endDrag() {
		// No cleanup needed for click-based placement
	}

	return {
		startDrag,
		moveDrag,
		endDrag
	};
}

function placeTile(
	building: IBuilding | Partial<IBuilding>,
	gridPos: Position,
	tileList: SvelteMap<string, GridNodeData>
): void {
	const key = `${gridPos.x},${gridPos.y}`;

	if (!building.name || !building.display_name) {
		throw new Error('Missing required field for placing tile');
	}

	// Create sprite for this tile
	const pattern = calculateConnectPattern(gridPos, building.name, tileList);
	const textureAlias = `${building.name}_${pattern}`;
	const sprite = Sprite.from(textureAlias);

	sprite.label = building.name;

	const worldPos = gridToWorld(gridPos.x, gridPos.y);
	sprite.x = worldPos.x;
	sprite.y = worldPos.y;

	const originalTexture = sprite.texture;
	const scaleX = CELL_SIZE / originalTexture.width;
	const scaleY = CELL_SIZE / originalTexture.height;
	const scale = Math.min(scaleX, scaleY);

	sprite.width = originalTexture.width * scale;
	sprite.height = originalTexture.height * scale;
	sprite.zIndex = building.scene_layer || 1;

	blueprint.buildContainer?.addChild(sprite);

	// Store tile data
	tileList.set(key, {
		name: building.name,
		displayName: building.display_name,
		sprite: sprite
	});

	// Update adjacent tiles' textures (they may now have new connections)
	for (const offset of ADJACENT_OFFSETS) {
		const adjacentPos = { x: gridPos.x + offset.x, y: gridPos.y + offset.y };
		const adjacentKey = `${adjacentPos.x},${adjacentPos.y}`;
		const adjacentTile = tileList.get(adjacentKey);

		if (adjacentTile && adjacentTile.name === building.name) {
			updateTileTexture(adjacentPos, tileList);
		}
	}
}

function removeTile(gridPos: Position, tileList: SvelteMap<string, GridNodeData>): void {
	const key = `${gridPos.x},${gridPos.y}`;
	const tileData = tileList.get(key);

	if (!tileData) return;

	const tileName = tileData.name;

	// Destroy the sprite
	if (tileData.sprite) {
		tileData.sprite.destroy();
	}

	// Remove from list
	tileList.delete(key);

	// Update adjacent tiles' textures (they lost a connection)
	for (const offset of ADJACENT_OFFSETS) {
		const adjacentPos = { x: gridPos.x + offset.x, y: gridPos.y + offset.y };
		const adjacentKey = `${adjacentPos.x},${adjacentPos.y}`;
		const adjacentTile = tileList.get(adjacentKey);

		if (adjacentTile && adjacentTile.name === tileName) {
			updateTileTexture(adjacentPos, tileList);
		}
	}
}

function updateTileTexture(
	gridPos: Position,
	tileList: SvelteMap<string, GridNodeData>
): void {
	const key = `${gridPos.x},${gridPos.y}`;
	const tileData = tileList.get(key);

	if (!tileData || !tileData.name) return;

	const pattern = calculateConnectPattern(gridPos, tileData.name, tileList);
	const textureAlias = `${tileData.name}_${pattern}`;

	if (tileData.sprite) {
		const updatedTexture = Sprite.from(textureAlias).texture;
		tileData.sprite.texture = updatedTexture;
	}
}

// Calculate connection pattern by checking adjacent positions for same-name tiles
function calculateConnectPattern(
	gridPos: Position,
	tileName: string,
	tileList: SvelteMap<string, GridNodeData>
): string {
	let hasLeft = false;
	let hasRight = false;
	let hasUp = false;
	let hasDown = false;

	// Check each adjacent position
	for (const offset of ADJACENT_OFFSETS) {
		const adjacentKey = `${gridPos.x + offset.x},${gridPos.y + offset.y}`;
		const adjacentTile = tileList.get(adjacentKey);

		if (adjacentTile && adjacentTile.name === tileName) {
			if (offset.x < 0) hasLeft = true;
			else if (offset.x > 0) hasRight = true;

			if (offset.y < 0) hasUp = true;
			else if (offset.y > 0) hasDown = true;
		}
	}

	// Build pattern in LRUD order
	let pattern = '';
	if (hasLeft) pattern += 'L';
	if (hasRight) pattern += 'R';
	if (hasUp) pattern += 'U';
	if (hasDown) pattern += 'D';

	if (pattern === '') pattern = 'noConnection';

	return pattern;
}

export { clickPlaceTile, updateTileTexture, placeTile, removeTile };
