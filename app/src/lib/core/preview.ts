import type { IBuilding, PortOverlapDetail, Position } from 'src/interface/building';
import { FederatedPointerEvent, Sprite, Container, Graphics } from 'pixi.js';
import { CELL_SIZE, PORT } from '$lib/constant';
import type { PreviewState } from 'src/interface/building';
import { getCollidingBuildings } from './collision';
import { blueprint } from '$lib/state/blueprint.svelte';
import { appConfig, message } from '$lib/state/config.svelte';
import { worldToGrid } from '$lib/utils/grid/transform';
import { getPortSpriteAlias, getOverlayInfo } from '$lib/utils';
import { getPortPositions, applyOrientationTransform } from './drawBuilding';
import { getSpriteOffset } from './spriteOffset';
import { getBuildingBounds, getRotatingBoundary } from './positioning';
import { OVERLAY } from '$lib/constant';

// Create mouse move handler for building preview with grid snapping
function previewBuilding(
	sprite: Sprite,
	currentBuilding: IBuilding,
	options?: {
		offset?: Position;
		orientation?: number;
		getOrientation?: () => number;
	}
): PreviewState {
	const offset = options?.offset ?? { x: 0, y: 0 };
	const orientation = options?.orientation ?? 0;
	const getOrientation = options?.getOrientation;

	// Create a parent container to hold both the sprite and port container
	const previewContainer = new Container();
	previewContainer.label = 'Building Preview';
	const portContainer = new Container();
	portContainer.label = 'Port Preview';

	// Create boundary box graphics
	const boundaryBox = new Graphics();
	boundaryBox.label = 'Boundary Box';
	const buildingWidthPx = currentBuilding.width * CELL_SIZE;
	const buildingHeightPx = currentBuilding.height * CELL_SIZE;
	boundaryBox.rect(0, 0, buildingWidthPx, buildingHeightPx);
	boundaryBox.stroke({ width: 2, color: 0x00ff00 });
	boundaryBox.visible = appConfig.devMode;

	if (sprite.parent) {
		sprite.parent.addChild(previewContainer);
	}
	previewContainer.addChild(sprite);
	previewContainer.addChild(portContainer);
	previewContainer.addChild(boundaryBox);

	// Apply visual sprite offset (doesn't affect collision)
	const spriteOffset = getSpriteOffset(currentBuilding.name);
	sprite.position.x += spriteOffset.x * CELL_SIZE;
	sprite.position.y += spriteOffset.y * CELL_SIZE;

	const currentOverlay = appConfig.selectedOverlay;
	const { portSpriteInput, portSpriteOutput } = getPortSpriteAlias(currentOverlay);

	// Get all port positions of the building with rotation applied
	const buildingPorts = getPortPositions(currentBuilding, 0, 0, orientation);

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
		offset,
		currentBuilding,
		getOrientation
	);

	return {
		previewContainer: previewContainer,
		mouseMoveHandler: previewHandler
	};
}

function updatePreviewOrientation(
	sprite: Sprite,
	portContainer: Container,
	building: IBuilding,
	offset: Position,
	newOrientation: number
): void {
	const rotationPermit = building.rotation_permit ?? 0;
	const spriteWidth = sprite.texture.width;
	const spriteHeight = sprite.texture.height;

	// Reset sprite transform first
	sprite.anchor.set(0, 0);
	sprite.position.set(0, 0);
	sprite.scale.set(1, 1);
	sprite.angle = 0;

	// Apply rotation/flip transform
	applyOrientationTransform(sprite, newOrientation, rotationPermit);

	// Rotation 90deg or full circle - adjust anchor to rotate around origin cell center
	if ((rotationPermit === 1 || rotationPermit === 2) && newOrientation !== 0) {
		const pivotX = (-offset.x + 0.5) * CELL_SIZE;
		const pivotY = (-offset.y + 0.5) * CELL_SIZE;
		sprite.anchor.set(pivotX / spriteWidth, pivotY / spriteHeight);
		sprite.position.set(pivotX, pivotY);
	}

	// Horizontal flip - adjust anchor to flip around center of offset tile on X-axis
	if (rotationPermit === 3 && newOrientation === 1) {
		const originTileCenter = (-offset.x + 0.5) * CELL_SIZE;
		const anchorX = originTileCenter / spriteWidth;
		sprite.anchor.set(anchorX, 0);
		sprite.position.set(originTileCenter, 0);
	}

	// Vertical flip - adjust anchor to flip around center of offset tile on Y-axis
	if (rotationPermit === 4 && newOrientation === 1) {
		const originTileCenter = (-offset.y + 0.5) * CELL_SIZE;
		const anchorY = originTileCenter / spriteHeight;
		sprite.anchor.set(0, anchorY);
		sprite.position.set(0, originTileCenter);
	}

	// Apply visual sprite offset (doesn't affect collision)
	const spriteOffset = getSpriteOffset(building.name);
	sprite.position.x += spriteOffset.x * CELL_SIZE;
	sprite.position.y += spriteOffset.y * CELL_SIZE;

	// Recreate port sprites at rotated positions
	portContainer.removeChildren();

	const newBuildingPorts = getPortPositions(building, 0, 0, newOrientation);
	const currentOverlay = appConfig.selectedOverlay;
	const { portSpriteInput, portSpriteOutput } = getPortSpriteAlias(currentOverlay);

	for (const port of newBuildingPorts) {
		if (port.category !== currentOverlay) continue;
		const spriteAlias = port.type === PORT.INPUT ? portSpriteInput : portSpriteOutput;
		if (!spriteAlias) continue;

		try {
			const portSprite = Sprite.from(spriteAlias);
			portSprite.width = CELL_SIZE / 2;
			portSprite.height = CELL_SIZE / 2;
			portSprite.position.set(
				(port.x - offset.x) * CELL_SIZE + CELL_SIZE / 4,
				(port.y - offset.y) * CELL_SIZE + CELL_SIZE / 4
			);
			portSprite.alpha = 0.7;
			portContainer.addChild(portSprite);
		} catch (error) {
			console.warn(`Port sprite ${spriteAlias} not loaded yet`);
		}
	}

	// Update boundary box for rotation
	const boundaryBox = sprite.parent?.children.find((c) => c.label === 'Boundary Box');
	if (boundaryBox instanceof Graphics) {
		boundaryBox.clear();

		let boxX = 0;
		let boxY = 0;
		let boxWidth = building.width * CELL_SIZE;
		let boxHeight = building.height * CELL_SIZE;

		if (rotationPermit === 1 || rotationPermit === 2) {
			if (newOrientation === 90 || newOrientation === 270) {
				boxWidth = building.height * CELL_SIZE;
				boxHeight = building.width * CELL_SIZE;
			}
			if (newOrientation !== 0) {
				const rotated = getRotatingBoundary(getBuildingBounds(building), newOrientation);
				boxX = (rotated.minX - offset.x) * CELL_SIZE;
				boxY = (-rotated.maxY - offset.y) * CELL_SIZE;
			}
		}

		boundaryBox.rect(boxX, boxY, boxWidth, boxHeight);
		boundaryBox.stroke({ width: 2, color: 0x00ff00 });
		boundaryBox.visible = appConfig.devMode;
	}
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
	offset: Position,
	currentBuilding: IBuilding,
	getOrientation?: () => number
): (event: FederatedPointerEvent) => void {
	return (event: FederatedPointerEvent) => {
		if (!blueprint.camera) {
			console.error('Error in preview handler');
			return;
		}

		const worldPos = blueprint.camera.screenToWorld(event.global.x, event.global.y);

		// Snap to grid
		const { gridX, gridY } = worldToGrid(worldPos);

		container.position.set((gridX + offset.x) * CELL_SIZE, (gridY + offset.y) * CELL_SIZE);
		container.zIndex = 999;

		// Update boundary box visibility
		const boundaryBox = container.children.find((child) => child.label === 'Boundary Box');
		if (boundaryBox) {
			boundaryBox.visible = appConfig.devMode;
		}

		// Check for collision
		const currentOrientation = getOrientation?.() ?? 0;
		const collideBuildings = getCollidingBuildings({
			placedBuildings: blueprint.placedBuildings,
			currentBuilding,
			gridX: gridX,
			gridY: gridY,
			orientation: currentOrientation,
			rotationPermit: currentBuilding.rotation_permit ?? 0
		});

		const collideBuildingLayers = new Set(
			collideBuildings.map((building) => building.object_layer)
		);

		const invalidPlacement =
			collideBuildings.length && collideBuildingLayers.has(currentBuilding.object_layer);

		const currentBuildingPorts = getPortPositions(currentBuilding, 0, 0, currentOrientation);
		const portOverlapDetail = checkPortOverlap(
			currentBuildingPorts,
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

export { previewBuilding, updatePreviewOrientation };
