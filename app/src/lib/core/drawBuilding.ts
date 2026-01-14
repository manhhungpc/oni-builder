import type { IBuilding, Position } from 'src/interface/building';
import { FederatedPointerEvent, Sprite } from 'pixi.js';
import { CELL_SIZE, MOUSE_CLICK, PORT } from '$lib/constant';
import type { PlacementState } from 'src/interface/building';
import { calculateBuildingGridPositions, calculateBuildingOffset } from './positioning';
import { blueprint } from '$lib/state/blueprint.svelte';
import { worldToGrid } from '$lib/utils/grid/transform';
import { CONDUIT_TYPE, OVERLAY } from '$lib/constant';
import { getPortSpriteAlias } from '$lib/utils';
import { appConfig } from 'src/lib/state/config.svelte';

// Type for port position data
type PortPosition = { x: number; y: number; type: PORT; category: OVERLAY };

// Initialize building draw on canvas
function drawBuilding(
	sprite: Sprite,
	building: IBuilding,
	options?: {
		getOrientation?: () => number;
		onPlace?: (gridX: number, gridY: number) => void;
		onCancel?: () => void;
	}
): PlacementState {
	const clickHandler = placeOnGridHandler(building, {
		getOrientation: options?.getOrientation,
		onPlace: options?.onPlace,
		onCancel: options?.onCancel
	});

	return {
		sprite,
		clickHandler
	};
}

function placeOnGridHandler(
	buildingData: IBuilding,
	options: {
		getOrientation?: () => number;
		onPlace?: (gridX: number, gridY: number) => void;
		onCancel?: () => void;
	}
): (event: FederatedPointerEvent) => void {
	return (event: FederatedPointerEvent) => {
		if (event.button === MOUSE_CLICK.LEFT) {
			// Check if placement is valid
			if (!blueprint.isValidPlacement || !blueprint.camera || !options.getOrientation) {
				console.error('Error in draw building to canvas');
				return;
			}

			const worldPos = blueprint.camera.screenToWorld(event.global.x, event.global.y);
			const { gridX, gridY } = worldToGrid(worldPos);
			const orientation = options.getOrientation();

			placeBuildingAtGrid(buildingData, gridX, gridY, orientation);
			options.onPlace?.(gridX, gridY);
		} else if (event.button === MOUSE_CLICK.RIGHT) {
			if (options.onCancel) options.onCancel();
		}
	};
}

function placeBuildingAtGrid(
	buildingData: IBuilding,
	gridX: number,
	gridY: number,
	orientation: number
): void {
	const container = blueprint.buildContainer;
	if (!container) return;

	const offset = calculateBuildingOffset(buildingData);
	const rotationPermit = buildingData.rotation_permit ?? 0;

	// Set view mode if building has one
	if (buildingData.view_mode) {
		appConfig.selectedOverlay = buildingData.view_mode;
	}

	const buildingSprite = Sprite.from(buildingData.name);

	// Center sprite on building grid area
	const gridCenterX = (gridX + offset.x + buildingData.width / 2) * CELL_SIZE;
	const gridCenterY = (gridY + offset.y + buildingData.height / 2) * CELL_SIZE;

	buildingSprite.label = buildingData.name;
	buildingSprite.position.set(
		gridCenterX - buildingSprite.width / 2,
		gridCenterY - buildingSprite.height / 2
	);
	buildingSprite.zIndex = buildingData.scene_layer;

	applyOrientationTransform(buildingSprite, orientation, rotationPermit);

	// Rotation 90deg or full circle
	if (rotationPermit === 1 || rotationPermit === 2) {
		buildingSprite.anchor.set(0.5, 0.5);
		buildingSprite.position.set(gridCenterX, gridCenterY);
	}

	// Horizontal flip
	if (rotationPermit === 3 && orientation === 1) {
		const originTileCenter = (-offset.x + 0.5) * CELL_SIZE;
		const anchorX = originTileCenter / buildingSprite.width;
		const anchorWorldX = (gridX + offset.x) * CELL_SIZE + originTileCenter;
		const anchorWorldY = (gridY + offset.y) * CELL_SIZE;
		buildingSprite.anchor.set(anchorX, 0);
		buildingSprite.position.set(anchorWorldX, anchorWorldY);
	}

	// Vertical flip
	if (rotationPermit === 4 && orientation === 1) {
		const originTileCenter = (-offset.y + 0.5) * CELL_SIZE;
		const anchorY = originTileCenter / buildingSprite.height;
		const anchorWorldX = (gridX + offset.x) * CELL_SIZE;
		const anchorWorldY = (gridY + offset.y) * CELL_SIZE + originTileCenter;
		buildingSprite.anchor.set(0, anchorY);
		buildingSprite.position.set(anchorWorldX, anchorWorldY);
	}

	container.addChild(buildingSprite);

	const buildingWorldPosition = calculateBuildingGridPositions(buildingData, gridX, gridY);

	const portPositions = getPortPositions(buildingData, gridX, gridY, orientation);
	const portsData = [];

	for (const port of portPositions) {
		const { portSpriteInput, portSpriteOutput } = getPortSpriteAlias(port.category);
		const portSprite = Sprite.from(port.type === PORT.INPUT ? portSpriteInput : portSpriteOutput);

		portSprite.label = buildingData.name + '_port_' + port.type;
		portSprite.width = CELL_SIZE / 2;
		portSprite.height = CELL_SIZE / 2;
		portSprite.position.set(port.x * CELL_SIZE + CELL_SIZE / 4, port.y * CELL_SIZE + CELL_SIZE / 4);

		portSprite.zIndex = 101;
		portSprite.visible = port.category === appConfig.selectedOverlay;

		container.addChild(portSprite);

		portsData.push({
			type: CONDUIT_TYPE.LIQUID,
			offset: {
				x: port.x,
				y: port.y
			},
			direction: port.type,
			category: port.category,
			sprite: portSprite
		});
	}

	blueprint.placedBuildings.push({
		display_name: buildingData.display_name,
		object_layer: buildingData.object_layer,
		scene_layer: buildingData.scene_layer,
		view_mode: buildingData.view_mode ?? 0,
		orientation: orientation,
		rotation_permit: rotationPermit,
		top_left: buildingWorldPosition.topLeft,
		bottom_right: buildingWorldPosition.bottomRight,
		sprite: buildingSprite,
		ports: portsData
	});
}

function getPortPositions(
	building: IBuilding,
	gridX: number,
	gridY: number,
	orientation: number = 0
): PortPosition[] {
	const portPositions: PortPosition[] = [];
	const rotationPermit = building.rotation_permit ?? 0;

	if (building.conduit) {
		const isGasConduit =
			building.conduit.input_type === CONDUIT_TYPE.GAS ||
			building.conduit.output_type === CONDUIT_TYPE.GAS;
		const isLiquidConduit =
			building.conduit.input_type === CONDUIT_TYPE.LIQUID ||
			building.conduit.output_type === CONDUIT_TYPE.LIQUID;

		if (building.conduit.input_offset) {
			const rotatedOffset = rotateOffset(
				building.conduit.input_offset,
				orientation,
				rotationPermit
			);
			const inputPort = calculatePortOffset({ x: gridX, y: gridY }, rotatedOffset);

			if (isGasConduit) {
				portPositions.push({
					x: inputPort.x,
					y: inputPort.y,
					type: PORT.INPUT,
					category: OVERLAY.VENTILATION
				});
			}
			if (isLiquidConduit) {
				portPositions.push({
					x: inputPort.x,
					y: inputPort.y,
					type: PORT.INPUT,
					category: OVERLAY.PLUMBING
				});
			}
		}

		if (building.conduit.output_offset) {
			const rotatedOffset = rotateOffset(
				building.conduit.output_offset,
				orientation,
				rotationPermit
			);
			const outputPort = calculatePortOffset({ x: gridX, y: gridY }, rotatedOffset);

			// Add to appropriate port map based on conduit type
			if (isGasConduit) {
				portPositions.push({
					x: outputPort.x,
					y: outputPort.y,
					type: PORT.OUTPUT,
					category: OVERLAY.VENTILATION
				});
			}
			if (isLiquidConduit) {
				portPositions.push({
					x: outputPort.x,
					y: outputPort.y,
					type: PORT.OUTPUT,
					category: OVERLAY.PLUMBING
				});
			}
		}
	}

	if (building.logic_port && building.logic_port.length > 0) {
		building.logic_port.forEach((port) => {
			const rotatedOffset = rotateOffset(port.offset, orientation, rotationPermit);
			const portPosition = calculatePortOffset({ x: gridX, y: gridY }, rotatedOffset);
			const portType = port.type === 'input' ? PORT.INPUT : PORT.OUTPUT;
			portPositions.push({
				x: portPosition.x,
				y: portPosition.y,
				type: portType,
				category: OVERLAY.AUTOMATION
			});
		});
	}

	if (building.power_port) {
		// Process power input ports
		if (building.power_port.input_offset) {
			const rotatedOffset = rotateOffset(
				building.power_port.input_offset,
				orientation,
				rotationPermit
			);
			const inputPort = calculatePortOffset({ x: gridX, y: gridY }, rotatedOffset);
			portPositions.push({
				x: inputPort.x,
				y: inputPort.y,
				type: PORT.INPUT,
				category: OVERLAY.POWER
			});
		}

		// Process power output ports
		if (building.power_port.output_offset) {
			const rotatedOffset = rotateOffset(
				building.power_port.output_offset,
				orientation,
				rotationPermit
			);
			const outputPort = calculatePortOffset({ x: gridX, y: gridY }, rotatedOffset);
			portPositions.push({
				x: outputPort.x,
				y: outputPort.y,
				type: PORT.OUTPUT,
				category: OVERLAY.POWER
			});
		}
	}

	return portPositions;
}

function calculatePortOffset(position: Position, offset: Position) {
	const x = position.x + offset.x;
	const y = position.y - offset.y;

	return { x, y };
}

function rotateOffset(offset: Position, orientation: number, rotationPermit: number): Position {
	// For horizontal flip (flip by Y-axis), mirror on X-axis
	if (rotationPermit === 3) {
		if (orientation === 1) {
			return { x: -offset.x, y: offset.y };
		}
		return offset;
	}

	// For vertical flip (flip by X-axis), mirror on Y-axis
	if (rotationPermit === 4) {
		if (orientation === 1) {
			return { x: offset.x, y: -offset.y };
		}
		return offset;
	}

	// For rotation, rotate the offset clockwise
	switch (orientation) {
		case 90:
			return { x: offset.y, y: -offset.x };
		case 180:
			return { x: -offset.x, y: -offset.y };
		case 270:
			return { x: -offset.y, y: offset.x };
		default:
			return offset;
	}
}

function applyOrientationTransform(
	sprite: Sprite,
	orientation: number,
	rotationPermit: number
): void {
	if (rotationPermit === 3) {
		// Flip by Y-axis (horizontal flip)
		sprite.scale.x = orientation === 1 ? -1 : 1;
	} else if (rotationPermit === 4) {
		// Flip by X-axis (vertical flip)
		sprite.scale.y = orientation === 1 ? -1 : 1;
	} else if (rotationPermit === 1 || rotationPermit === 2) {
		sprite.angle = orientation;
	}
}

export {
	drawBuilding,
	placeBuildingAtGrid,
	calculatePortOffset,
	getPortPositions,
	rotateOffset,
	applyOrientationTransform
};
export type { PortPosition };
