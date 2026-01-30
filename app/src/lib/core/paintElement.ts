import { FederatedPointerEvent, Graphics } from 'pixi.js';
import { worldToGrid, gridToWorld } from '$lib/utils/grid/transform';
import type { Position } from 'src/interface/building';
import type { IElement, PlacedElement } from 'src/interface/element';
import { CELL_SIZE, MOUSE_CLICK, ACTION } from '$lib/constant';
import { blueprint } from '$lib/state/blueprint.svelte';
import { appConfig } from '$lib/state/config.svelte';

export interface PaintHandlers {
	startPaint: (event: FederatedPointerEvent) => void;
	movePaint: (event: FederatedPointerEvent) => void;
	endPaint: () => void;
}

/**
 * Check if an element can be placed at the given grid position
 * (1 tile can only have 1 element)
 */
export function canPlaceElement(gridX: number, gridY: number): boolean {
	const key = `${gridX},${gridY}`;
	return !blueprint.hasElement(key);
}

/**
 * Parse element colour string "r,g,b,a" to hex number
 */
function parseElementColor(colorString: string | null): number {
	if (!colorString) return 0x808080; // Default gray

	const parts = colorString.split(',').map(Number);
	if (parts.length < 3) return 0x808080;

	const [r, g, b] = parts;
	return (r << 16) | (g << 8) | b;
}

/**
 * Place an element at the specified grid position
 */
export function placeElement(element: IElement, gridPos: Position): boolean {
	const key = `${gridPos.x},${gridPos.y}`;

	// Check if tile already has an element
	if (blueprint.hasElement(key)) {
		return false;
	}

	// Create colored rectangle for the element
	const sprite = new Graphics();
	const color = parseElementColor(element.colour);

	sprite.rect(0, 0, CELL_SIZE, CELL_SIZE);
	sprite.fill({ color, alpha: 0.7 });

	const worldPos = gridToWorld(gridPos.x, gridPos.y);
	sprite.x = worldPos.x;
	sprite.y = worldPos.y;
	sprite.zIndex = 1; // Below buildings

	blueprint.buildContainer?.addChild(sprite);

	// Store element data
	const placedElement: PlacedElement = {
		elementId: element.id,
		name: element.name,
		type: element.type,
		colour: element.colour,
		sprite
	};

	blueprint.addElement(key, placedElement);
	return true;
}

/**
 * Remove an element from the specified grid position
 */
export function removeElement(gridPos: Position): boolean {
	const key = `${gridPos.x},${gridPos.y}`;
	if (!blueprint.hasElement(key)) {
		return false;
	}
	blueprint.removeElement(key);
	return true;
}

/**
 * Create paint handlers for element painting (click/drag)
 */
export function paintElementHandlers(element: IElement): PaintHandlers {
	const placedPositions = new Set<string>();

	function startPaint(event: FederatedPointerEvent) {
		if (event.button !== MOUSE_CLICK.LEFT || !blueprint.camera) {
			return;
		}

		if (appConfig.selectedAction !== ACTION.PAINT) {
			return;
		}

		const worldPos = blueprint.camera.screenToWorld(event.global.x, event.global.y);
		const { gridX, gridY } = worldToGrid(worldPos);
		const key = `${gridX},${gridY}`;

		if (!placedPositions.has(key)) {
			if (placeElement(element, { x: gridX, y: gridY })) {
				placedPositions.add(key);
			}
		}
	}

	function movePaint(event: FederatedPointerEvent) {
		// Only paint when left mouse button is held
		if (event.buttons !== 1 || !blueprint.camera) {
			return;
		}

		if (appConfig.selectedAction !== ACTION.PAINT) {
			return;
		}

		const worldPos = blueprint.camera.screenToWorld(event.global.x, event.global.y);
		const { gridX, gridY } = worldToGrid(worldPos);
		const key = `${gridX},${gridY}`;

		// Only place if not already placed in this drag session
		if (!placedPositions.has(key)) {
			if (placeElement(element, { x: gridX, y: gridY })) {
				placedPositions.add(key);
			}
		}
	}

	function endPaint() {
		placedPositions.clear();
	}

	return {
		startPaint,
		movePaint,
		endPaint
	};
}
