import * as PIXI from 'pixi.js';
import { blueprint } from '$lib/state/blueprint.svelte';
import { ConduitType } from '$lib/state/blueprint.svelte';
import { PORT, CELL_SIZE } from '$lib/constant';
import { calculateBuildingOffset, getBuildingBounds } from '$lib/core/positioning';
import { loadSprites } from '$lib/rendering/pixi';
import type { ConduitNode } from 'src/interface/building';
import type { IBuilding } from 'src/interface/building';
import type { PlacedBuildings } from 'src/interface';
import { listBuilding } from '$lib/api/buildings.api';
import { getPortSpriteAlias } from '$lib/utils';
import { appConfig } from 'src/lib/state/config.svelte';
import { updateConduitTexture } from '$lib/core/connectConduit';

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
		container.addChild(buildingSprite);

		savedBuilding.sprite = buildingSprite;

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

export async function loadSavedConduits(
	savedConnections?: Record<string, Map<string, ConduitNode>>
) {
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
		{ key: 'liquidPipes', savedData: blueprint.placedConduits[ConduitType.LIQUID] },
		{ key: 'gasPipes', savedData: blueprint.placedConduits[ConduitType.GAS] },
		{ key: 'wires', savedData: blueprint.placedConduits[ConduitType.WIRE] },
		{ key: 'logicWires', savedData: blueprint.placedConduits[ConduitType.LOGIC_WIRE] },
		{ key: 'conveyor', savedData: blueprint.placedConduits[ConduitType.CONVEYOR] }
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
}
