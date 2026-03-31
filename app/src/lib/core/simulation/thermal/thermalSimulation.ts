import type { PlacedElement, ElementWithThermal } from 'src/interface/element';
import { calculateHeatChange } from './heatTransfer';

export interface ThermalPair {
	indexA: number;
	indexB: number;
}

export interface ThermalState {
	cells: PlacedElement[];
	keys: string[];
	pairs: ThermalPair[];
}

/**
 * Collect all solid elements from placed elements and build adjacency pairs.
 * Returns the thermal state ready for simulation.
 */
export function initThermalState(
	placedElements: Map<string, PlacedElement>
): ThermalState {
	const cells: PlacedElement[] = [];
	const keys: string[] = [];

	for (const [key, element] of placedElements) {
		if (element.type === 'solid') {
			keys.push(key);
			cells.push(element);
		}
	}

	const pairs = buildAdjacentPairs(keys);

	return { cells, keys, pairs };
}

/**
 * Find all adjacent pairs among the given grid keys.
 * Each pair is stored once (deduplicated).
 */
function buildAdjacentPairs(keys: string[]): ThermalPair[] {
	const keyToIndex = new Map<string, number>();
	for (let i = 0; i < keys.length; i++) {
		keyToIndex.set(keys[i], i);
	}

	const pairs: ThermalPair[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < keys.length; i++) {
		const [x, y] = keys[i].split(',').map(Number);
		const neighbors = [
			`${x + 1},${y}`,
			`${x - 1},${y}`,
			`${x},${y + 1}`,
			`${x},${y - 1}`
		];

		for (const nKey of neighbors) {
			const j = keyToIndex.get(nKey);
			if (j === undefined) continue;

			const pairKey = i < j ? `${i},${j}` : `${j},${i}`;
			if (!seen.has(pairKey)) {
				seen.add(pairKey);
				pairs.push({ indexA: i, indexB: j });
			}
		}
	}

	return pairs;
}

/**
 * Convert a PlacedElement to ElementWithThermal for heat calculation.
 */
function toElementWithThermal(cell: PlacedElement): ElementWithThermal {
	return {
		id: cell.elementId,
		idx: 0,
		name: cell.name,
		texture: '',
		type: cell.type as 'solid' | 'liquid' | 'gas' | 'vacuum',
		colour: cell.colour,
		uiColour: null,
		conduitColour: null,
		specificHeatCapacity: cell.specificHeatCapacity,
		thermalConductivity: cell.thermalConductivity,
		mass: cell.mass,
		temperature: cell.temperature
	};
}

/**
 * Run one thermal tick — apply heat transfer between all adjacent pairs.
 * Skips pairs where |ΔT| < 1°C.
 * Returns true if any transfer occurred.
 */
export function stepThermal(state: ThermalState): boolean {
	let anyTransfer = false;

	for (const pair of state.pairs) {
		const cellA = state.cells[pair.indexA];
		const cellB = state.cells[pair.indexB];

		if (Math.abs(cellA.temperature - cellB.temperature) < 1) continue;

		const elemA = toElementWithThermal(cellA);
		const elemB = toElementWithThermal(cellB);

		const { finalTempA, finalTempB } = calculateHeatChange(elemA, elemB);

		cellA.temperature = finalTempA;
		cellB.temperature = finalTempB;
		anyTransfer = true;
	}

	return anyTransfer;
}
