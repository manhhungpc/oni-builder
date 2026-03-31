import { blueprint, ConduitType } from '$lib/state/blueprint.svelte';
import { checkBuildingBoundary } from '$lib/utils';
import type { PlacedBuildings } from 'src/interface';
import type { GridNodeData } from 'src/interface/building';
import type { PlacedElement } from 'src/interface/element';

export interface GridQueryResult {
	buildings: PlacedBuildings[];
	conduits: Array<{ type: ConduitType; displayName: string }>;
	tile: GridNodeData | null;
	element: PlacedElement | null;
	isEmpty: boolean;
}

export function getItemsAtGridPosition(gridX: number, gridY: number): GridQueryResult {
	const buildings: PlacedBuildings[] = [];
	const conduits: Array<{ type: ConduitType; displayName: string }> = [];
	let tile: GridNodeData | null = null;

	// Check buildings using boundary check
	for (const building of blueprint.placedBuildings) {
		if (checkBuildingBoundary({ x: gridX, y: gridY }, building)) {
			buildings.push(building);
		}
	}

	const conduitTypes = [
		ConduitType.LIQUID,
		ConduitType.GAS,
		ConduitType.WIRE,
		ConduitType.LOGIC_WIRE,
		ConduitType.CONVEYOR
	];

	const key = `${gridX},${gridY}`;

	for (const type of conduitTypes) {
		const conduitMap = blueprint.placedConduits[type];
		if (conduitMap.has(key)) {
			const data = conduitMap.get(key)!;
			conduits.push({
				type,
				displayName: data.metadata?.displayName ?? "Unknow conduit"
			});
		}
	}

	// Check tiles
	if (blueprint.placedTiles.has(key)) {
		tile = blueprint.placedTiles.get(key)!;
	}

	// Check elements
	const element = blueprint.placedElements.get(key) ?? null;

	return {
		buildings,
		conduits,
		tile,
		element,
		isEmpty: buildings.length === 0 && conduits.length === 0 && !tile && !element
	};
}
