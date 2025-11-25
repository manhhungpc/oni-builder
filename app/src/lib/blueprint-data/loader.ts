import * as PIXI from 'pixi.js';
import { blueprint } from '$lib/state/blueprint.svelte';
import { ConduitType } from '$lib/state/blueprint.svelte';
import { CONDUIT_TYPE, PORT, CELL_SIZE } from '$lib/constant';
import { calculateBuildingOffset, getBuildingBounds } from '$lib/core/positioning';
import { loadSprites } from '$lib/rendering/pixi';
import type { ConduitNode } from 'src/interface/building';
import type { IBuilding } from 'src/interface/building';
import type { PlacedBuildings } from 'src/interface';
import { listBuilding } from '$lib/api/buildings.api';

/**
 * Load saved buildings onto the canvas
 * @param container - The PIXI container to add buildings to
 * @param savedBuildings - Array of saved building data
 */
export async function loadSavedBuildings(
	container: PIXI.Container,
	savedBuildings?: PlacedBuildings[]
) {
	if (!savedBuildings || !blueprint.pixiApp || !container) return;

	const buildingsToLoad: PlacedBuildings[] = savedBuildings;

	// Get unique building names to fetch from API
	const uniqueNames = [...new Set(buildingsToLoad.map((b) => b.display_name))];

	// Create a map of building display_name to full building data
	const buildingDataMap = new Map<string, IBuilding>();

	// Fetch building data for each unique building type
	for (const displayName of uniqueNames) {
		try {
			const buildings = await listBuilding({ search: displayName });
			const building = buildings.find((b) => b.display_name === displayName);
			if (building) {
				buildingDataMap.set(displayName, building);
			}
		} catch (error) {
			console.error(`Failed to fetch building data for ${displayName}:`, error);
		}
	}

	// Load sprites for all buildings
	const BASE_IMG_PATH = import.meta.env.VITE_IMAGE_BASE_PATH;
	const buildingsToLoadSprites = Array.from(buildingDataMap.values());
	if (buildingsToLoadSprites.length > 0) {
		await loadSprites(buildingsToLoadSprites, BASE_IMG_PATH);
	}

	// Place each building on the canvas
	for (const savedBuilding of buildingsToLoad) {
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

		buildingSprite.position.set((gridX + offset.x) * CELL_SIZE, (gridY + offset.y) * CELL_SIZE);
		buildingSprite.width = buildingData.width * CELL_SIZE;
		buildingSprite.height = buildingData.height * CELL_SIZE;
		buildingSprite.zIndex = savedBuilding.scene_layer;
		container.addChild(buildingSprite);

		// Add to placedBuildings array with ports info
		savedBuilding.sprite = buildingSprite;
		blueprint.placedBuildings.push(savedBuilding);

		// Reconstruct ports and attach sprites
		reconstructBuildingPorts(buildingData, savedBuilding, buildingSprite);
	}
}

/**
 * Load saved connections into global state
 * @param savedConnections - Record of connection data by type
 */
export function loadSavedConnections(savedConnections?: Record<string, Map<string, ConduitNode>>) {
	if (!savedConnections) return;

	// Map connection types to their corresponding global stores
	const connectionMap = {
		liquidPipes: blueprint.placedConduits[ConduitType.LIQUID],
		gasPipes: blueprint.placedConduits[ConduitType.GAS],
		wires: blueprint.placedConduits[ConduitType.WIRE],
		logicWires: blueprint.placedConduits[ConduitType.LOGIC_WIRE],
		conveyor: blueprint.placedConduits[ConduitType.CONVEYOR]
	};

	// Iterate through each connection type and populate the global stores
	for (const [connectionType, connectionData] of Object.entries(savedConnections)) {
		const globalStore = connectionMap[connectionType as keyof typeof connectionMap];

		if (globalStore && connectionData) {
			// Clear existing connections
			globalStore.clear();

			// Populate with saved connections
			connectionData.forEach((nodeData: ConduitNode, key: string) => {
				globalStore.set(key, nodeData);
			});
		}
	}
}

/**
 * Reconstruct port connections for a building and attach port sprites
 * @param building - Building data with port information
 * @param gridX - Grid X position of the building
 * @param gridY - Grid Y position of the building
 * @param placedBuilding - The placed building object to store port data
 * @param buildingSprite - The building sprite to attach port sprites to
 */
export function reconstructBuildingPorts(
	building: IBuilding,
	placedBuilding: PlacedBuildings,
	buildingSprite: PIXI.Sprite
) {
	// Initialize ports array if not exists
	if (!placedBuilding.ports) {
		placedBuilding.ports = [];
	}

	// Handle conduit ports (liquid/gas)
	if (building.conduit) {
		if (
			building.conduit.input_type !== undefined &&
			building.conduit.input_type !== null &&
			building.conduit.input_offset
		) {
			const relX = building.conduit.input_offset.x;
			const relY = -building.conduit.input_offset.y; // Correct: minus for y-axis flip

			// Create port sprite and attach to building
			const portSprite = createPortSprite(building.conduit.input_type, PORT.INPUT);
			portSprite.position.set(relX * CELL_SIZE, relY * CELL_SIZE);
			buildingSprite.addChild(portSprite);

			placedBuilding.ports.push({
				offset: { x: relX, y: relY },
				type: building.conduit.input_type,
				direction: PORT.INPUT,
				sprite: portSprite
			});
		}

		if (
			building.conduit.output_type !== undefined &&
			building.conduit.output_type !== null &&
			building.conduit.output_offset
		) {
			const relX = building.conduit.output_offset.x;
			const relY = -building.conduit.output_offset.y;

			const portSprite = createPortSprite(building.conduit.output_type, PORT.OUTPUT);
			portSprite.position.set(relX * CELL_SIZE, relY * CELL_SIZE);
			buildingSprite.addChild(portSprite);

			placedBuilding.ports.push({
				offset: { x: relX, y: relY },
				type: building.conduit.output_type,
				direction: PORT.OUTPUT,
				sprite: portSprite
			});
		}
	}

	// Handle power ports (power uses same sprite for input/output)
	if (building.power_port) {
		if (building.power_port.input_offset) {
			const relX = building.power_port.input_offset.x;
			const relY = -building.power_port.input_offset.y;

			// Power port doesn't have input/output distinction in sprite
			const portSprite = PIXI.Sprite.from('power_port');
			portSprite.width = CELL_SIZE;
			portSprite.height = CELL_SIZE;
			portSprite.position.set(relX * CELL_SIZE, relY * CELL_SIZE);
			buildingSprite.addChild(portSprite);

			placedBuilding.ports.push({
				offset: { x: relX, y: relY },
				type: CONDUIT_TYPE.LIQUID, // Use LIQUID as placeholder for power
				direction: PORT.INPUT,
				sprite: portSprite
			});
		}

		if (building.power_port.output_offset) {
			const relX = building.power_port.output_offset.x;
			const relY = -building.power_port.output_offset.y;

			const portSprite = PIXI.Sprite.from('power_port');
			portSprite.width = CELL_SIZE;
			portSprite.height = CELL_SIZE;
			portSprite.position.set(relX * CELL_SIZE, relY * CELL_SIZE);
			buildingSprite.addChild(portSprite);

			placedBuilding.ports.push({
				offset: { x: relX, y: relY },
				type: CONDUIT_TYPE.LIQUID, // Use LIQUID as placeholder for power
				direction: PORT.OUTPUT,
				sprite: portSprite
			});
		}
	}

	// Handle logic ports
	if (building.logic_port && building.logic_port.length > 0) {
		for (const port of building.logic_port) {
			const relX = port.offset.x;
			const relY = -port.offset.y;
			const portType = port.type === 'input' ? PORT.INPUT : PORT.OUTPUT;
			const spriteAlias = portType === PORT.INPUT ? 'logic_input' : 'logic_output';

			const portSprite = PIXI.Sprite.from(spriteAlias);
			portSprite.width = CELL_SIZE;
			portSprite.height = CELL_SIZE;
			portSprite.position.set(relX * CELL_SIZE, relY * CELL_SIZE);
			buildingSprite.addChild(portSprite);

			placedBuilding.ports.push({
				offset: { x: relX, y: relY },
				type: CONDUIT_TYPE.LIQUID, // Use LIQUID as placeholder for logic
				direction: portType,
				sprite: portSprite
			});
		}
	}
}

/**
 * Helper function to create a port sprite based on conduit type and direction
 */
function createPortSprite(conduitType: CONDUIT_TYPE, direction: PORT): PIXI.Sprite {
	let spriteAlias = '';

	if (conduitType === CONDUIT_TYPE.LIQUID || conduitType === CONDUIT_TYPE.GAS) {
		spriteAlias = direction === PORT.INPUT ? 'conduit_input' : 'conduit_output';
	} else if (conduitType === CONDUIT_TYPE.CONVEYOR) {
		spriteAlias = direction === PORT.INPUT ? 'conduit_input' : 'conduit_output';
	}

	const sprite = PIXI.Sprite.from(spriteAlias);
	sprite.width = CELL_SIZE;
	sprite.height = CELL_SIZE;

	return sprite;
}
