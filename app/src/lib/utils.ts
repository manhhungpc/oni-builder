import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ACTION, CELL_SIZE, OVERLAY, PORT, CONDUIT_TYPE } from '$lib/constant';
import type { IBuilding, OverlayInfo, Position } from 'src/interface/building';
import { blueprint } from 'src/lib/state/blueprint.svelte';
import { worldToGrid } from 'src/lib/utils/grid/transform';
import { FederatedPointerEvent, Graphics } from 'pixi.js';
import { appConfig } from 'src/lib/state/config.svelte';
import type { PlacedBuildings } from 'src/interface';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;

export function getPortSpriteAlias(overlayType: OVERLAY) {
	let portSpriteInput = '',
		portSpriteOutput = '';
	if (
		overlayType == OVERLAY.PLUMBING ||
		overlayType == OVERLAY.VENTILATION ||
		overlayType == OVERLAY.SHIPPING
	) {
		portSpriteInput = 'conduit_input';
		portSpriteOutput = 'conduit_output';
	}

	if (overlayType == OVERLAY.POWER) {
		portSpriteInput = 'power_port';
		portSpriteOutput = 'power_port';
	}

	if (overlayType == OVERLAY.AUTOMATION) {
		portSpriteInput = 'logic_input';
		portSpriteOutput = 'logic_output';
	}

	return {
		portSpriteInput,
		portSpriteOutput
	};
}

export function getOverlayInfo(overlay: OVERLAY): OverlayInfo | null {
	switch (overlay) {
		case OVERLAY.VENTILATION:
			return {
				name: 'Gas',
				ports: blueprint.getPortsByConduitType(CONDUIT_TYPE.GAS),
				setPort: (key: string, portType: PORT) => {
					// Port setting now happens within building data
					// This function is kept for compatibility but may need refactoring
				}
			};
		case OVERLAY.PLUMBING:
			return {
				name: 'Liquid',
				ports: blueprint.getPortsByConduitType(CONDUIT_TYPE.LIQUID),
				setPort: (key: string, portType: PORT) => {
					// Port setting now happens within building data
				}
			};
		case OVERLAY.POWER:
			return {
				name: 'Power',
				ports: blueprint.getPortsByConduitType(CONDUIT_TYPE.LIQUID), // TODO: Need separate power type
				setPort: (key: string, portType: PORT) => {
					// Port setting now happens within building data
				}
			};
		case OVERLAY.AUTOMATION:
			return {
				name: 'Logic',
				ports: blueprint.getPortsByConduitType(CONDUIT_TYPE.LIQUID), // TODO: Need separate logic type
				setPort: (key: string, portType: PORT) => {
					// Port setting now happens within building data
				}
			};
		case OVERLAY.SHIPPING:
			return {
				name: 'Conveyor',
				ports: blueprint.getPortsByConduitType(CONDUIT_TYPE.CONVEYOR),
				setPort: (key: string, portType: PORT) => {
					// Port setting now happens within building data
				}
			};
		default:
			return null;
	}
}

const highlight = new Graphics();
export function createDeleteHighlight(event: FederatedPointerEvent) {
	if (appConfig.selectedAction == ACTION.DELETE) {
		// Create red rectangle
		highlight.rect(0, 0, CELL_SIZE, CELL_SIZE);
		highlight.fill({ color: 0xff0000 });

		blueprint.buildContainer?.addChild(highlight);
		highlight.zIndex = 998;

		// Handler to move the highlight
		if (!blueprint.camera) {
			return;
		}

		const worldPos = blueprint.camera.screenToWorld(event.global.x, event.global.y);
		const { gridX, gridY } = worldToGrid(worldPos);

		highlight.position.set(gridX * CELL_SIZE, gridY * CELL_SIZE);
	} else {
		highlight.clear();
	}
}

export function checkBuildingBoundary(
	clickPosition: Position,
	buildingData: PlacedBuildings
): boolean {
	const { top_left, bottom_right } = buildingData;
	return (
		clickPosition.x >= top_left.x &&
		clickPosition.x <= bottom_right.x &&
		clickPosition.y >= top_left.y &&
		clickPosition.y <= bottom_right.y
	);
}
