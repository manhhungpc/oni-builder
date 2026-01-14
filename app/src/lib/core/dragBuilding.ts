import type { IBuilding, DragDrawHandlers } from 'src/interface/building';
import { FederatedPointerEvent } from 'pixi.js';
import { MOUSE_CLICK } from '$lib/constant';
import { blueprint } from '$lib/state/blueprint.svelte';
import { worldToGrid } from '$lib/utils/grid/transform';
import { getCollidingBuildings } from './collision';
import { placeBuildingAtGrid } from './drawBuilding';

function dragPlaceBuilding(
	building: IBuilding,
	options?: {
		getOrientation?: () => number;
		onPlace?: (gridX: number, gridY: number) => void;
	}
): DragDrawHandlers {
	const placedPositions = new Set<string>();

	function startDrag(event: FederatedPointerEvent) {
		if (event.button !== MOUSE_CLICK.LEFT || !blueprint.camera) {
			return;
		}

		const worldPos = blueprint.camera.screenToWorld(event.global.x, event.global.y);
		const { gridX, gridY } = worldToGrid(worldPos);
		const orientation = options?.getOrientation?.() ?? 0;

		// Check collision before placing
		if (isValidPlacement(building, gridX, gridY)) {
			placeBuildingAtGrid(building, gridX, gridY, orientation);
			placedPositions.add(`${gridX},${gridY}`);
			options?.onPlace?.(gridX, gridY);
		}
	}

	function moveDrag(event: FederatedPointerEvent) {
		if (event.buttons !== 1 || !blueprint.camera) {
			return;
		}

		const worldPos = blueprint.camera.screenToWorld(event.global.x, event.global.y);
		const { gridX, gridY } = worldToGrid(worldPos);
		const key = `${gridX},${gridY}`;
		const orientation = options?.getOrientation?.() ?? 0;

		if (placedPositions.has(key)) {
			return;
		}

		// Check collision before placing (skip invalid positions silently)
		if (isValidPlacement(building, gridX, gridY)) {
			placeBuildingAtGrid(building, gridX, gridY, orientation);
			placedPositions.add(key);
			options?.onPlace?.(gridX, gridY);
		}
	}

	function endDrag() {
		placedPositions.clear();
	}

	return {
		startDrag,
		moveDrag,
		endDrag
	};
}

function isValidPlacement(building: IBuilding, gridX: number, gridY: number): boolean {
	const collidingBuildings = getCollidingBuildings({
		placedBuildings: blueprint.placedBuildings,
		currentBuilding: building,
		gridX,
		gridY
	});

	// Check if any colliding building is on the same object layer
	const hasCollision = collidingBuildings.some(
		(placed) => placed.object_layer === building.object_layer
	);

	return !hasCollision;
}

export { dragPlaceBuilding, isValidPlacement };
