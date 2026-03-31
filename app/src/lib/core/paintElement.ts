import { FederatedPointerEvent, Graphics, Sprite, Container, Assets } from 'pixi.js';
import { worldToGrid, gridToWorld } from '$lib/utils/grid/transform';
import type { Position } from 'src/interface/building';
import type { IElement, PlacedElement } from 'src/interface/element';
import { CELL_SIZE, MOUSE_CLICK, ACTION } from '$lib/constant';
import { blueprint } from '$lib/state/blueprint.svelte';
import { appConfig } from '$lib/state/config.svelte';
import { rgbaToHex } from '$lib/utils/color';

export interface PaintHandlers {
	startPaint: (event: FederatedPointerEvent) => void;
	movePaint: (event: FederatedPointerEvent) => void;
	endPaint: () => void;
}

const WAVE_ICON_ALIAS = 'element-wave';
const BUBBLE_ICON_ALIAS = 'element-bubble';

export async function loadElementIcons(): Promise<void> {
	await Promise.all([
		Assets.load({ alias: WAVE_ICON_ALIAS, src: '/icon/Wave.svg' }),
		Assets.load({ alias: BUBBLE_ICON_ALIAS, src: '/icon/Bubble.svg' })
	]);
}

/**
 * Place an element at the specified grid position
 */
export function placeElement(element: IElement, gridPos: Position): boolean {
	const key = `${gridPos.x},${gridPos.y}`;

	// Remove existing element if present
	if (blueprint.hasElement(key)) {
		blueprint.removeElement(key);
	}

	const container = new Container({label: `Element ${element.name}`});
	const elementColor = rgbaToHex(element.colour);

	const gridColor = new Graphics();
	gridColor.rect(0, 0, CELL_SIZE, CELL_SIZE);
	gridColor.fill({ color: elementColor, alpha: 0.7 });
	container.addChild(gridColor);

	if (element.type === 'liquid') {
		const iconSprite = Sprite.from(WAVE_ICON_ALIAS);
		iconSprite.width = CELL_SIZE;
		iconSprite.height = CELL_SIZE;
		container.addChild(iconSprite);
	} else if (element.type === 'gas') {
		const iconSprite = Sprite.from(BUBBLE_ICON_ALIAS);
		iconSprite.width = CELL_SIZE;
		iconSprite.height = CELL_SIZE;
		container.addChild(iconSprite);
	}

	const worldPos = gridToWorld(gridPos.x, gridPos.y);
	container.x = worldPos.x;
	container.y = worldPos.y;
	container.zIndex = 1; // Below buildings

	blueprint.buildContainer?.addChild(container);

	// Store element data
	const placedElement: PlacedElement = {
		elementId: element.id,
		name: element.name,
		type: element.type,
		colour: element.colour,
		mass: appConfig.paintMass,
		temperature: appConfig.paintTemperature,
		specificHeatCapacity: element.specificHeatCapacity,
		thermalConductivity: element.thermalConductivity,
		container
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
