import type { IBuilding, Position } from 'src/interface/building';
import type { Camera } from '$lib/rendering/camera';
import { Container, FederatedPointerEvent, Sprite, Application, Graphics } from 'pixi.js';
import { CELL_SIZE, MOUSE_CLICK, PORT } from '$lib/constant';
import type { PlacementState } from 'src/interface/building';
import { calculateBuildingGridPositions, calculateBuildingOffset } from './positioning';
import { blueprint } from '$lib/state/blueprint.svelte';
import { worldToGrid } from '$lib/utils/grid/transform';
import { CONDUIT_TYPE, OVERLAY } from '$lib/constant';
import { getOverlayInfo } from '$lib/utils';

// Type for port position data
type PortPosition = { x: number; y: number; type: PORT; category: OVERLAY };

// Initialize building draw on canvas
function drawBuilding(
	sprite: Sprite,
	building: IBuilding,
	container: Container,
	camera: Camera,
	options?: {
		onPlace?: (gridX: number, gridY: number) => void;
		onCancel?: () => void;
	}
): PlacementState {
	const clickHandler = placeOnGridHandler(building, camera, container, {
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
	camera: Camera,
	container: Container,
	options: {
		onPlace?: (gridX: number, gridY: number) => void;
		onCancel?: () => void;
	}
): (event: FederatedPointerEvent) => void {
	return (event: FederatedPointerEvent) => {
		const offset = calculateBuildingOffset(buildingData);

		if (event.button === MOUSE_CLICK.LEFT) {
			// Check if placement is valid
			if (!blueprint.isValidPlacement) {
				return;
			}
			const worldPos = camera.screenToWorld(event.global.x, event.global.y);
			const { gridX, gridY } = worldToGrid(worldPos);

			// Create permanent building
			let buildingSprite = Sprite.from(buildingData.name);
			buildingSprite.position.set((gridX + offset.x) * CELL_SIZE, (gridY + offset.y) * CELL_SIZE);
			buildingSprite.width = buildingData.width * CELL_SIZE;
			buildingSprite.height = buildingData.height * CELL_SIZE;
			buildingSprite.zIndex = buildingData.scene_layer;
			container.addChild(buildingSprite);
			const buildingWorldPosition = calculateBuildingGridPositions(buildingData, gridX, gridY);

			blueprint.placedBuildings.push({
				display_name: buildingData.display_name,
				category: buildingData.category || '',
				object_layer: buildingData.object_layer,
				scene_layer: buildingData.scene_layer,
				tile_layer: buildingData.tile_layer,
				view_mode: buildingData.view_mode ?? 0,
				top_left: buildingWorldPosition.topLeft,
				bottom_right: buildingWorldPosition.bottomRight
			});

			// Get port positions and permanently draw to grid
			const portPositions = getPortPositions(buildingData, gridX, gridY);
			portPositions.forEach((port) => {
				const key = `${port.x},${port.y}`;
				const overlayInfo = getOverlayInfo(port.category);
				if (overlayInfo) {
					overlayInfo.setPort(key, port.type);
				}
			});

			options.onPlace?.(gridX, gridY);
		} else if (event.button === MOUSE_CLICK.RIGHT) {
			if (options.onCancel) options.onCancel();
		}
	};
}

function getPortPositions(building: IBuilding, gridX: number, gridY: number): PortPosition[] {
	const portPositions: PortPosition[] = [];
	if (building.conduit) {
		const isGasConduit =
			building.conduit.input_type === CONDUIT_TYPE.GAS ||
			building.conduit.output_type === CONDUIT_TYPE.GAS;
		const isLiquidConduit =
			building.conduit.input_type === CONDUIT_TYPE.LIQUID ||
			building.conduit.output_type === CONDUIT_TYPE.LIQUID;

		if (building.conduit.input_offset) {
			const inputPort = calculatePortOffset({ x: gridX, y: gridY }, building.conduit.input_offset);

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
			const outputPort = calculatePortOffset(
				{ x: gridX, y: gridY },
				building.conduit.output_offset
			);

			// Step 6: Add to appropriate port map based on conduit type
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
			const portPosition = calculatePortOffset({ x: gridX, y: gridY }, port.offset);
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
		// Step 11: Process power input ports
		if (building.power_port.input_offset) {
			const inputPort = calculatePortOffset(
				{ x: gridX, y: gridY },
				building.power_port.input_offset
			);
			portPositions.push({
				x: inputPort.x,
				y: inputPort.y,
				type: PORT.INPUT,
				category: OVERLAY.POWER
			});
		}

		// Step 12: Process power output ports
		if (building.power_port.output_offset) {
			const outputPort = calculatePortOffset(
				{ x: gridX, y: gridY },
				building.power_port.output_offset
			);
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

export { drawBuilding, calculatePortOffset, getPortPositions };
export type { PortPosition };
