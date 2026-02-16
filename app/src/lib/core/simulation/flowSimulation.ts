import { blueprint, ConduitType } from '$lib/state/blueprint.svelte';
import { OVERLAY, PORT } from '$lib/constant';
import { parseNodeKey, bfs } from '$lib/utils/grid/adjacency';

// ── Main functions ──────────────────────────────────────────────────

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
	const conduitMap = blueprint.placedConduits[ConduitType.LIQUID];
	const [firstPipe] = filledPipes;
	const network = bfs(firstPipe, conduitMap);

	// Now find port (degree ≤ 1) and classify by port type
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

/**
 * Auto-fill from a clicked position:
 * BFS from clickedPosition to find nearest OUTPUT port,
 * then BFS from that OUTPUT port through all connected pipes.
 */
export function autoFillFromPosition(clickedPosition: string): Set<string> {
	const filled = new Set<string>();

	const outputPort = bfsFindPort(clickedPosition, 'output');
	if (!outputPort) {
		console.warn('No OUTPUT port reachable from clicked pipe');
		return filled;
	}

	const queue: string[] = [outputPort];
	filled.add(outputPort);

	while (queue.length > 0) {
		const current = queue.shift()!;

		if (isInputPort(current)) {
			const building = findBuildingWithPort(current, PORT.INPUT);
			if (building) {
				const buildingOutput = getBuildingOutputPort(building);
				if (buildingOutput && !filled.has(buildingOutput)) {
					filled.add(buildingOutput);
					queue.push(buildingOutput);
				}
			}
			continue;
		}

		for (const neighbor of getConnectedPipes(current)) {
			if (filled.has(neighbor)) continue;
			if (hasConduit(neighbor) || isInputPort(neighbor)) {
				filled.add(neighbor);
				queue.push(neighbor);
			}
		}
	}

	return filled;
}

/**
 * Returns {dx, dy} direction vector for rendering arrows.
 */
export function getFlowDirection(
	position: string,
	pipeDirections: Map<string, string[]>
): { dx: number; dy: number } | null {
	const targets = pipeDirections.get(position);
	if (!targets || targets.length === 0) return null;

	const from = parseNodeKey(position);
	const to = parseNodeKey(targets[0]);

	return {
		dx: to.x - from.x,
		dy: to.y - from.y
	};
}

// ── Helpers ─────────────────────────────────────────────────────────

export function isInputPort(position: string): boolean {
	const ports = blueprint.getPortsByCategory(OVERLAY.PLUMBING);
	return ports.get(position) === PORT.INPUT;
}

export function isOutputPort(position: string): boolean {
	const ports = blueprint.getPortsByCategory(OVERLAY.PLUMBING);
	return ports.get(position) === PORT.OUTPUT;
}

export function findBuildingWithPort(position: string, portType: PORT): typeof blueprint.placedBuildings[0] | null {
	const [posX, posY] = position.split(',').map(Number);

	for (const building of blueprint.placedBuildings) {
		if (building.ports) {
			for (const port of building.ports) {
				if (port.category === OVERLAY.PLUMBING && port.direction === portType) {
					const absX = building.top_left.x + port.offset.x;
					const absY = building.top_left.y + port.offset.y;
					if (absX === posX && absY === posY) {
						return building;
					}
				}
			}
		}
	}
	return null;
}

export function getBuildingOutputPort(building: typeof blueprint.placedBuildings[0]): string | null {
	if (!building.ports) return null;

	for (const port of building.ports) {
		if (port.category === OVERLAY.PLUMBING && port.direction === PORT.OUTPUT) {
			const absX = building.top_left.x + port.offset.x;
			const absY = building.top_left.y + port.offset.y;
			return `${absX},${absY}`;
		}
	}
	return null;
}

export function getConnectedPipes(position: string): string[] {
	const conduitMap = blueprint.placedConduits[ConduitType.LIQUID];
	const node = conduitMap.get(position);
	if (!node) return [];
	return node.connects;
}

export function hasConduit(position: string): boolean {
	const conduitMap = blueprint.placedConduits[ConduitType.LIQUID];
	return conduitMap.has(position);
}

export function gridToWorld(position: string, cellSize: number): { x: number; y: number } {
	const pos = parseNodeKey(position);
	return {
		x: pos.x * cellSize + cellSize / 2,
		y: pos.y * cellSize + cellSize / 2
	};
}

function bfsFindPort(startPosition: string, portType: 'input' | 'output'): string | null {
	const checkFn = portType === 'input' ? isInputPort : isOutputPort;

	if (checkFn(startPosition)) return startPosition;

	const visited = new Set<string>();
	const queue: string[] = [startPosition];
	visited.add(startPosition);

	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const neighbor of getConnectedPipes(current)) {
			if (visited.has(neighbor)) continue;
			visited.add(neighbor);
			if (checkFn(neighbor)) return neighbor;
			if (hasConduit(neighbor)) queue.push(neighbor);
		}
	}

	return null;
}

