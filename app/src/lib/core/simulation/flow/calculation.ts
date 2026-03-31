import type { IElement } from 'src/interface/element';
import type { PacketState } from 'src/interface/pipeFlow';
import { blueprint } from '$lib/state/blueprint.svelte';
import { pipeFlowState } from '$lib/state/flowSimulation.svelte';
import { bfs } from '$lib/utils/grid/adjacency';
import { getConduitType } from '$lib/utils/helpers';
import { PORT } from '$lib/constant';
import {
	isOutputPort,
	isInputPort,
	getConnectedPipes,
	findBuildingWithPort,
	getBuildingOutputPort
} from './helpers';

// #region Network discovery
// BFS spread from a single pipe through its entire connected conduit network.
function buildPipesNetwork(startPipe: string): {
	network: Set<string>;
	outputEnds: string[];
	inputEnds: string[];
	blankEnds: string[];
} {
	const conduitMap = blueprint.placedConduits[getConduitType()];
	const network = bfs(startPipe, conduitMap);

	// Expand network through buildings: INPUT port → building's OUTPUT port → other side
	const jumpQueue = [...network].filter((pos) => isInputPort(pos));
	while (jumpQueue.length > 0) {
		const pos = jumpQueue.shift()!;
		const building = findBuildingWithPort(pos, PORT.INPUT);
		if (!building) continue;
		const outputPos = getBuildingOutputPort(building);
		if (!outputPos || network.has(outputPos)) continue;

		const otherSide = bfs(outputPos, conduitMap);
		for (const p of otherSide) {
			network.add(p);
			if (isInputPort(p)) jumpQueue.push(p);
		}
	}

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

// Build a map of INPUT position → OUTPUT position for buildings with a valid downstream sink.
function buildPortPairs(network: Set<string>): Map<string, string> {
	const conduitMap = blueprint.placedConduits[getConduitType()];
	const jumps = new Map<string, string>();
	for (const pos of network) {
		if (!isInputPort(pos)) continue;
		const building = findBuildingWithPort(pos, PORT.INPUT);
		if (!building) continue;
		const outputPos = getBuildingOutputPort(building);
		if (!outputPos || !network.has(outputPos)) continue;

		const downstreamNetwork = bfs(outputPos, conduitMap);
		const hasSink = [...downstreamNetwork].some((p) => isInputPort(p));
		if (hasSink) {
			jumps.set(pos, outputPos);
		}
	}
	return jumps;
}

// Calculate flow directions for all filled pipe networks.
export function calculateDirections(filledPipes: Set<string>): void {
	const directions = new Map<string, string[]>();
	const allPortJumps = new Map<string, string>();

	if (filledPipes.size === 0) {
		pipeFlowState.pipeDirections = directions;
		pipeFlowState.portPairs = allPortJumps;
		return;
	}

	const discovered = new Set<string>();

	for (const pipe of filledPipes) {
		if (discovered.has(pipe)) continue;

		const { network, outputEnds, inputEnds } = buildPipesNetwork(pipe);

		for (const pos of network) {
			discovered.add(pos);
		}

		if (inputEnds.length === 0) {
			console.log('[CALC] stuck: no input ends found for network at', pipe);
			continue;
		}

		const portPairs = buildPortPairs(network);
		for (const [k, v] of portPairs) {
			allPortJumps.set(k, v);
		}

		const startPos = outputEnds.length > 0 ? outputEnds[0] : [...network].pop()!;

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

			const jumpTarget = portPairs.get(current);
			if (jumpTarget && !visited.has(jumpTarget)) {
				visited.add(jumpTarget);
				directions.set(jumpTarget, []);
				queue.push(jumpTarget);
			}

			const existing = directions.get(current) || [];
			directions.set(current, [...existing, ...children]);
		}
	}

	pipeFlowState.pipeDirections = directions;
	pipeFlowState.portPairs = allPortJumps;
}

// #region Packet lifecycle
function passThroughPorts(packetStates: PacketState[]): void {
	const occupied = new Set(packetStates.map((s) => s.from));
	for (const state of packetStates) {
		const jumpTarget = pipeFlowState.portPairs.get(state.from);
		if (jumpTarget && !occupied.has(jumpTarget)) {
			occupied.delete(state.from);
			state.from = jumpTarget;
			occupied.add(jumpTarget);
		}
	}
}

export function initPackets(filledPipes: Set<string>, element: IElement): PacketState[] {
	const defaultMass = element.type === 'gas' ? 1 : 10;
	const packetStates: PacketState[] = [];

	for (const pos of filledPipes) {
		packetStates.push({
			from: pos,
			element,
			temperature: 300,
			mass: defaultMass
		});
	}

	passThroughPorts(packetStates);
	planMoves(packetStates);
	return packetStates;
}

// Plan next moves for packets using reverse-iteration occupancy check.
export function planMoves(packetStates: PacketState[]): void {
	const occupied = new Set<string>();
	const packetAt = new Map<string, PacketState>();
	for (const state of packetStates) {
		occupied.add(state.from);
		packetAt.set(state.from, state);
	}

	const flowOrder = [...pipeFlowState.pipeDirections.keys()].reverse();

	for (const pos of flowOrder) {
		const state = packetAt.get(pos);
		if (!state) continue;

		const nextCells = pipeFlowState.pipeDirections.get(pos);
		if (!nextCells || nextCells.length === 0) {
			state.to = undefined;
			continue;
		}

		const target = nextCells[0];
		const finalPos = pipeFlowState.portPairs.get(target) ?? target;

		if (!occupied.has(target) && !occupied.has(finalPos)) {
			state.to = target;
			occupied.add(finalPos);
			occupied.delete(pos);
		} else {
			state.to = undefined;
		}
	}
}

// Apply planned moves, teleport through buildings, then plan next moves.
export function applyMoves(packetStates: PacketState[]): boolean {
	for (const state of packetStates) {
		if (!state.to) continue;
		state.from = state.to;
		state.to = undefined;
	}

	passThroughPorts(packetStates);
	planMoves(packetStates);

	return packetStates.some((s) => s.to !== undefined);
}
