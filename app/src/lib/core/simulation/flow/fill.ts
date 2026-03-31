import { PORT } from '$lib/constant';
import {
	isInputPort,
	isOutputPort,
	getConnectedPipes,
	hasConduit,
	findBuildingWithPort,
	getBuildingOutputPort
} from './helpers';

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
