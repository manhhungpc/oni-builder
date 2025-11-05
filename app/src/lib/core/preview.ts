import type { IBuilding, PortOverlapDetail, Position } from 'src/interface/building';
import type { Camera } from '$lib/rendering/camera';
import { FederatedPointerEvent, Sprite, Container, Assets } from 'pixi.js';
import { CELL_SIZE, PORT } from '$lib/constant';
import type { PlacementState, PreviewState } from 'src/interface/building';
import { getCollidingBuildings } from './collision';
import { blueprint } from '$lib/state/blueprint.svelte';
import { appConfig, message } from '$lib/state/config.svelte';
import { worldToGrid } from '$lib/utils/grid/transform';
import { getPortSpriteAlias, getOverlayInfo } from '$lib/utils';
import { getPortPositions } from './drawBuilding';
import { OVERLAY } from '$lib/constant';

// Create mouse move handler for building preview with grid snapping
function previewBuilding(
	sprite: Sprite,
	currentBuilding: IBuilding,
	camera: Camera,
	offset: Position
): PreviewState {
	// Create a parent container to hold both the sprite and port container
	const previewContainer = new Container();
	previewContainer.label = 'Building Preview';
	const portContainer = new Container();
	portContainer.label = 'Port Preview';

	if (sprite.parent) {
		sprite.parent.addChild(previewContainer);
	}
	previewContainer.addChild(sprite);
	previewContainer.addChild(portContainer);

	const currentOverlay = appConfig.selectedOverlay;
	const { portSpriteInput, portSpriteOutput } = getPortSpriteAlias(currentOverlay);

	// Get all port positions of the building
	const buildingPorts = getPortPositions(currentBuilding, 0, 0);

	// Create sprites for each port of the building
	buildingPorts.forEach((port) => {
		if (port.category != appConfig.selectedOverlay) {
			return;
		}
		const spriteAlias = port.type === PORT.INPUT ? portSpriteInput : portSpriteOutput;
		if (!spriteAlias) return;

		try {
			const portSprite = Sprite.from(spriteAlias);
			portSprite.width = CELL_SIZE / 2;
			portSprite.height = CELL_SIZE / 2;
			// Center port on a grid
			portSprite.position.set(
				(port.x - offset.x) * CELL_SIZE + CELL_SIZE / 4,
				(port.y - offset.y) * CELL_SIZE + CELL_SIZE / 4
			);
			portSprite.alpha = 0.7;
			portContainer.zIndex = 1001;
			portContainer.addChild(portSprite);
		} catch (error) {
			console.warn(`Port sprite ${spriteAlias} not loaded yet`);
		}
	});

	const previewHandler = gridSnapPreviewHandler(
		previewContainer,
		camera,
		offset,
		currentBuilding,
		buildingPorts
	);

	return {
		previewContainer: previewContainer,
		mouseMoveHandler: previewHandler
	};
}

function checkPortOverlap(
	buildingPorts: Array<{ x: number; y: number; type: PORT; category: OVERLAY }>,
	gridX: number,
	gridY: number,
	currentOverlay: OVERLAY
): PortOverlapDetail {
	const result: PortOverlapDetail = {
		hasOverlap: false,
		overlaps: []
	};

	const overlayInfo = getOverlayInfo(currentOverlay);
	if (!overlayInfo) return result;

	for (const port of buildingPorts) {
		if (port.category !== currentOverlay) continue;

		// Calculate the actual grid position of this port
		const portGridX = gridX + port.x;
		const portGridY = gridY + port.y;
		const key = `${portGridX},${portGridY}`;

		const existingPort = overlayInfo.ports.get(key);
		if (existingPort !== undefined) {
			result.hasOverlap = true;
			result.overlaps.push({
				existPortType: existingPort,
				category: currentOverlay
			});
		}
	}

	return result;
}

function gridSnapPreviewHandler(
	container: Container,
	camera: Camera,
	offset: Position,
	currentBuilding: IBuilding,
	buildingPorts: Array<{ x: number; y: number; type: PORT; category: OVERLAY }>
): (event: FederatedPointerEvent) => void {
	return (event: FederatedPointerEvent) => {
		const worldPos = camera.screenToWorld(event.global.x, event.global.y);

		// Snap to grid
		const { gridX, gridY } = worldToGrid(worldPos);

		container.position.set((gridX + offset.x) * CELL_SIZE, (gridY + offset.y) * CELL_SIZE);
		container.zIndex = 999;

		// Check for collision
		const collideBuildings = getCollidingBuildings({
			placedBuildings: blueprint.placedBuildings,
			currentBuilding,
			gridX: gridX,
			gridY: gridY
		});

		const collideBuildingLayers = new Set(
			collideBuildings.map((building) => building.object_layer)
		);

		const invalidPlacement =
			collideBuildings.length && collideBuildingLayers.has(currentBuilding.object_layer);

		const portOverlapDetail = checkPortOverlap(
			buildingPorts,
			gridX,
			gridY,
			appConfig.selectedOverlay
		);

		if (invalidPlacement) {
			message.popup =
				'Collide with building ' +
				collideBuildings
					.filter((building) => building.object_layer === currentBuilding.object_layer)
					.map((building) => building.display_name)
					.join(', ');
			blueprint.isValidPlacement = false;
		} else if (portOverlapDetail.hasOverlap) {
			const overlapMessages = portOverlapDetail.overlaps.map((overlap) => {
				const overlayInfo = getOverlayInfo(overlap.category);
				const categoryName = overlayInfo?.name || 'Unknown';
				const portType = overlap.existPortType === PORT.INPUT ? 'Input' : 'Output';
				return `• Overlap with ${categoryName} ${portType} port`;
			});
			message.popup = 'Cannot build:\n' + overlapMessages.join('\n');
			blueprint.isValidPlacement = false;
		} else {
			message.popup = '';
			blueprint.isValidPlacement = true;
		}
	};
}

export { previewBuilding };
