import type { IElement } from 'src/interface/element';
import type { PacketState } from 'src/interface/pipeFlow';
import { blueprint } from '$lib/state/blueprint.svelte';
import { bfs } from '$lib/utils/grid/adjacency';
import { getConduitType } from '$lib/utils/helpers';
import { isOutputPort, isInputPort, getConnectedPipes } from './helpers';

// ── Network discovery ────────────────────────────────────────────────

/**
 * BFS spread from filled pipes through the entire conduit network.
 * For each conduit visited, check if it has a port (INPUT/OUTPUT).
 */
export function findPipesNetwork(filledPipes: Set<string>): {
	network: Set<string>;
	outputEnds: string[];
	inputEnds: string[];
	blankEnds: string[];
} {
	const conduitMap = blueprint.placedConduits[getConduitType()];
	const [firstPipe] = filledPipes;
	const network = bfs(firstPipe, conduitMap);

	const outputEnds: string[] = [];
	const inputEnds: string[] = [];
	const blankEnds: string[] = [];

	for (const pos of network) {
		const degreeInNetwork = getConnectedPipes(pos).filter((n) => network.has(n)).length;
		if (degreeInNetwork > 1) continue;

		if (isOutputPort(pos)) {
			outputEnds.push(pos);
		} else if (isInputPort(pos)) {
			inputEnds.push(pos);
		} else {
			blankEnds.push(pos);
		}
	}

	console.log('[SPREAD] outputEnds:', outputEnds, 'inputEnds:', inputEnds, 'blankEnds:', blankEnds);
	return { network, outputEnds, inputEnds, blankEnds };
}

/**
 * Calculate flow directions from filled pipes.
 * Uses findPipesNetwork to find ports, then builds direction map.
 * Keys are in BFS order from OUTPUT→INPUT.
 */
export function calculateDirections(filledPipes: Set<string>): Map<string, string[]> {
	const directions = new Map<string, string[]>();
	if (filledPipes.size === 0) return directions;

	const { network, outputEnds, inputEnds } = findPipesNetwork(filledPipes);

	if (inputEnds.length === 0) {
		console.log('[CALC] stuck: no input ends found');
		return directions;
	}

	// Start from OUTPUT end, or farthest pipe from INPUT if no OUTPUT
	const startPos = outputEnds.length > 0 ? outputEnds[0] : [...network].pop()!;

	// BFS from start through network to build direction map
	const visited = new Set<string>();
	const queue: string[] = [startPos];
	visited.add(startPos);
	directions.set(startPos, []);

	while (queue.length > 0) {
		const current = queue.shift()!;
		const children: string[] = [];

		for (const neighbor of getConnectedPipes(current)) {
			if (visited.has(neighbor)) continue;
			if (!network.has(neighbor)) continue;

			visited.add(neighbor);
			children.push(neighbor);
			directions.set(neighbor, []);
			queue.push(neighbor);
		}

		const existing = directions.get(current) || [];
		directions.set(current, [...existing, ...children]);
	}

	console.log('[CALC] directions:', [...directions.entries()]);
	return directions;
}

// ── Packet lifecycle ─────────────────────────────────────────────────

/**
 * Create packets for every filled pipe and plan their initial moves.
 */
export function initPackets(
	filledPipes: Set<string>,
	pipeDirections: Map<string, string[]>,
	element: IElement
): PacketState[] {
	const defaultMass = element.type === 'gas' ? 0.5 : 5;
	const packetStates: PacketState[] = [];

	for (const pos of filledPipes) {
		packetStates.push({
			from: pos,
			element,
			temperature: 300,
			mass: defaultMass
		});
	}

	planMoves(packetStates, pipeDirections);
	return packetStates;
}

/**
 * Reverse-iteration occupancy check for moving packets.
 */
export function planMoves(
	packetStates: PacketState[],
	pipeDirections: Map<string, string[]>
): void {
	const occupied = new Set<string>();
	const packetAt = new Map<string, PacketState>();
	for (const state of packetStates) {
		occupied.add(state.from);
		packetAt.set(state.from, state);
	}

	// Reverse = INPUT→OUTPUT = front-to-back
	const flowOrder = [...pipeDirections.keys()].reverse();

	for (const pos of flowOrder) {
		const state = packetAt.get(pos);
		if (!state) continue;

		const nextCells = pipeDirections.get(pos);
		if (!nextCells || nextCells.length === 0) {
			state.to = undefined;
			continue;
		}

		const target = nextCells[0];
		if (!occupied.has(target)) {
			state.to = target;
			occupied.delete(pos); // will be vacated
		} else {
			state.to = undefined; // blocked
		}
	}
}

/**
 * Move packets that have a planned target, then plan next moves.
 */
export function applyMoves(
	packetStates: PacketState[],
	pipeDirections: Map<string, string[]>
): boolean {
	for (const state of packetStates) {
		if (!state.to) continue;
		state.from = state.to;
		state.to = undefined;
	}

	planMoves(packetStates, pipeDirections);

	return packetStates.some((s) => s.to !== undefined);
}
