import { blueprint } from '$lib/state/blueprint.svelte';
import { PORT } from '$lib/constant';
import { parseNodeKey } from '$lib/utils/grid/adjacency';
import { getConduitType, getOverlay } from '$lib/utils/helpers';

export function isInputPort(position: string): boolean {
	const ports = blueprint.getPortsByCategory(getOverlay());
	return ports.get(position) === PORT.INPUT;
}

export function isOutputPort(position: string): boolean {
	const ports = blueprint.getPortsByCategory(getOverlay());
	return ports.get(position) === PORT.OUTPUT;
}

export function findBuildingWithPort(
	position: string,
	portType: PORT
): (typeof blueprint.placedBuildings)[0] | null {
	const [posX, posY] = position.split(',').map(Number);

	for (const building of blueprint.placedBuildings) {
		if (building.ports) {
			for (const port of building.ports) {
				if (port.category === getOverlay() && port.direction === portType) {
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

export function getBuildingOutputPort(
	building: (typeof blueprint.placedBuildings)[0]
): string | null {
	if (!building.ports) return null;

	for (const port of building.ports) {
		if (port.category === getOverlay() && port.direction === PORT.OUTPUT) {
			const absX = building.top_left.x + port.offset.x;
			const absY = building.top_left.y + port.offset.y;
			return `${absX},${absY}`;
		}
	}
	return null;
}

export function getConnectedPipes(position: string): string[] {
	const conduitMap = blueprint.placedConduits[getConduitType()];
	const node = conduitMap.get(position);
	if (!node) return [];
	return node.connects;
}

export function hasConduit(position: string): boolean {
	const conduitMap = blueprint.placedConduits[getConduitType()];
	return conduitMap.has(position);
}

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
