import * as PIXI from 'pixi.js';
import { blueprint } from '$lib/state/blueprint.svelte';
import { ConduitType } from '$lib/state/blueprint.svelte';
import { PORT, CELL_SIZE } from '$lib/constant';
import { calculateBuildingOffset, getBuildingBounds } from '$lib/core/positioning';
import { loadSprites } from '$lib/rendering/pixi';
import type { ConduitNode, GridNodeData } from 'src/interface/building';
import type { IBuilding } from 'src/interface/building';
import type { PlacedBuildings } from 'src/interface';
import { listBuilding } from '$lib/api/buildings.api';
import { getPortSpriteAlias } from '$lib/utils';
import { appConfig } from 'src/lib/state/config.svelte';
import { updateConduitTexture } from '$lib/core/connectConduit';
import { placeTile } from '$lib/core/connectTile';
import { applyOrientationTransform } from '$lib/core/drawBuilding';
import type { SavedConnections } from 'src/interface/compressData';

async function fetchAndLoadSprites(displayNames: string[]): Promise<Map<string, IBuilding>> {
	const buildingDataMap = new Map<string, IBuilding>();

	for (const displayName of displayNames) {
		try {
			const buildings = await listBuilding({ search: displayName });
			const building = buildings.find((b) => b.display_name === displayName);
			if (building) {
				buildingDataMap.set(displayName, building);
			}
		} catch (error) {
			console.error(`Failed to fetch data for ${displayName}:`, error);
		}
	}

	const buildingsToLoad = Array.from(buildingDataMap.values());
	if (buildingsToLoad.length > 0) {
		await loadSprites(buildingsToLoad);
	}

	return buildingDataMap;
}

export async function loadSavedBuildings(
	container: PIXI.Container,
	savedBuildings?: PlacedBuildings[]
) {
	if (!savedBuildings || !blueprint.pixiApp || !container) return;

	const uniqueNames = [...new Set(savedBuildings.map((b) => b.display_name))];
	const buildingDataMap = await fetchAndLoadSprites(uniqueNames);

	// Place each building on the canvas
	for (const savedBuilding of savedBuildings) {
		const buildingData = buildingDataMap.get(savedBuilding.display_name);
		if (!buildingData) {
			console.warn(`Building data not found for ${savedBuilding.display_name}`);
			continue;
		}

		// Reconstruct original grid position from saved top_left
		const bound = getBuildingBounds(buildingData);
		const gridX = savedBuilding.top_left.x - bound.minX;
		const gridY = savedBuilding.top_left.y + bound.maxY;

		// Create and place the building sprite
		const buildingSprite = PIXI.Sprite.from(buildingData.name);
		const offset = calculateBuildingOffset(buildingData);

		// Center sprite on building grid area (no scaling)
		const gridCenterX = (gridX + offset.x + buildingData.width / 2) * CELL_SIZE;
		const gridCenterY = (gridY + offset.y + buildingData.height / 2) * CELL_SIZE;

		buildingSprite.label = buildingData.name;
		buildingSprite.position.set(
			gridCenterX - buildingSprite.width / 2,
			gridCenterY - buildingSprite.height / 2
		);
		buildingSprite.zIndex = savedBuilding.scene_layer;

		// Apply orientation from saved data
		const orientation = savedBuilding.orientation ?? 0;
		const rotationPermit = savedBuilding.rotation_permit ?? buildingData.rotation_permit ?? 0;
		applyOrientationTransform(buildingSprite, orientation, rotationPermit);

		// For rotation, adjust anchor to rotate around center
		if ((rotationPermit === 1 || rotationPermit === 2) && orientation !== 0) {
			buildingSprite.anchor.set(0.5, 0.5);
			buildingSprite.position.set(gridCenterX, gridCenterY);
		}

		container.addChild(buildingSprite);

		savedBuilding.sprite = buildingSprite;
		// Ensure orientation and rotation_permit are set for future saves
		savedBuilding.orientation = orientation;
		savedBuilding.rotation_permit = rotationPermit;

		// Create port sprites from decompressed port data
		if (savedBuilding.ports) {
			for (const port of savedBuilding.ports) {
				const { portSpriteInput, portSpriteOutput } = getPortSpriteAlias(port.category);
				const portSprite = PIXI.Sprite.from(
					port.direction === PORT.INPUT ? portSpriteInput : portSpriteOutput
				);

				portSprite.label = savedBuilding.display_name + '_port_' + port.direction;
				portSprite.width = CELL_SIZE / 2;
				portSprite.height = CELL_SIZE / 2;
				portSprite.position.set(
					port.offset.x * CELL_SIZE + CELL_SIZE / 4,
					port.offset.y * CELL_SIZE + CELL_SIZE / 4
				);
				portSprite.zIndex = 101;
				portSprite.visible = port.category === appConfig.selectedOverlay;

				container.addChild(portSprite);
				port.sprite = portSprite;
			}
		}

		blueprint.placedBuildings.push(savedBuilding);
	}
}

export async function loadSavedConduits(savedConnections?: SavedConnections) {
	if (!savedConnections) return;

	// Collect unique conduit names from all connections
	const uniqueNames = new Set<string>();
	for (const connectionData of Object.values(savedConnections)) {
		if (!connectionData) continue;
		connectionData.forEach((nodeData: ConduitNode) => {
			if (nodeData.metadata?.displayName) {
				uniqueNames.add(nodeData.metadata.displayName);
			}
		});
	}

	// Load conduit sprites
	await fetchAndLoadSprites([...uniqueNames]);

	const connectionTypes = [
		{ key: 'liquidPipes' as const, savedData: blueprint.placedConduits[ConduitType.LIQUID] },
		{ key: 'gasPipes' as const, savedData: blueprint.placedConduits[ConduitType.GAS] },
		{ key: 'wires' as const, savedData: blueprint.placedConduits[ConduitType.WIRE] },
		{ key: 'logicWires' as const, savedData: blueprint.placedConduits[ConduitType.LOGIC_WIRE] },
		{ key: 'conveyor' as const, savedData: blueprint.placedConduits[ConduitType.CONVEYOR] }
	];

	for (const { key, savedData } of connectionTypes) {
		const connectionData = savedConnections[key];
		if (!connectionData) continue;

		savedData.clear();

		connectionData.forEach((nodeData: ConduitNode, nodeKey: string) => {
			savedData.set(nodeKey, nodeData);

			if (nodeData.metadata?.name && nodeData.metadata?.displayName) {
				const [x, y] = nodeKey.split(',').map(Number);
				updateConduitTexture(
					{ name: nodeData.metadata.name, display_name: nodeData.metadata.displayName },
					{ x, y },
					savedData
				);
			}
		});
	}

	// Load tiles separately (new format: GridNodeData with name, displayName directly)
	const tilesData = savedConnections['tiles'];
	if (tilesData) {
		blueprint.placedTiles.clear();

		tilesData.forEach((nodeData, nodeKey) => {
			// Handle both old format (with metadata wrapper) and new format
			const name = nodeData.name || (nodeData as any).metadata?.name;
			const displayName = nodeData.displayName || (nodeData as any).metadata?.displayName;

			if (name && displayName) {
				const [x, y] = nodeKey.split(',').map(Number);
				placeTile({ name, display_name: displayName }, { x, y }, blueprint.placedTiles);
			}
		});
	}
}
