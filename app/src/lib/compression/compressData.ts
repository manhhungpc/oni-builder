import { compress, decompress, type Compressed } from 'compress-json';
import type { PlacedBuildings } from 'src/interface';
import type { ConduitNode } from 'src/interface/building';
import type {
	SimplifiedBuilding,
	CompressedCanvasData,
	SimplifiedNode
} from 'src/interface/compressData';

function compressBuildingData(buildings: PlacedBuildings[]): Compressed {
	const simplifiedBuildings: SimplifiedBuilding[] = buildings.map((building) => ({
		d: building.display_name,
		tl: [building.top_left.x, building.top_left.y],
		br: [building.bottom_right.x, building.bottom_right.y],
		sl: building.scene_layer,
		ol: building.object_layer,
		vm: building.view_mode
	}));

	const compressedData = compress(simplifiedBuildings);

	return compressedData;
}

function decompressBuildingData(compressedData: CompressedCanvasData): PlacedBuildings[] {
	try {
		if (!compressedData.buildings) {
			throw new Error('Invalid canvas data format');
		}

		const decompressedBuildings = decompress(compressedData.buildings) as SimplifiedBuilding[];

		const buildings: PlacedBuildings[] = decompressedBuildings.map(
			(building: SimplifiedBuilding) => ({
				display_name: building.d,
				top_left: {
					x: building.tl[0],
					y: building.tl[1]
				},
				bottom_right: {
					x: building.br[0],
					y: building.br[1]
				},
				scene_layer: building.sl,
				object_layer: building.ol,
				view_mode: building.vm
			})
		);

		return buildings;
	} catch (error) {
		throw new Error(
			`Failed to decompress canvas data: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}

function getCompressionRatio(buildings: PlacedBuildings[]): number {
	const originalSize = JSON.stringify(buildings).length;
	const compressedData = compressBuildingData(buildings);
	const compressedSize = JSON.stringify(compressedData).length;
	return Math.round((1 - compressedSize / originalSize) * 100);
}

function compressBuildingConnectionData(connections: Map<string, ConduitNode>): Compressed {
	const simplifiedConnections: { [key: string]: SimplifiedNode } = {};

	connections.forEach((nodeData, key) => {
		simplifiedConnections[key] = {
			c: nodeData.connects,
			m: nodeData.metadata
				? {
						n: nodeData.metadata.name,
						d: nodeData.metadata.displayName
					}
				: undefined
		};
	});

	return compress(simplifiedConnections);
}

function decompressBuildingConnectionData(compressedData: Compressed): Map<string, ConduitNode> {
	try {
		const decompressedData = decompress(compressedData) as { [key: string]: SimplifiedNode };
		const connections = new Map<string, ConduitNode>();

		Object.entries(decompressedData).forEach(([key, node]) => {
			connections.set(key, {
				connects: node.c,
				metadata: node.m
					? {
							name: node.m.n,
							displayName: node.m.d
						}
					: {}
			});
		});

		return connections;
	} catch (error) {
		throw new Error(
			`Failed to decompress connection data: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}

export {
	compressBuildingData,
	decompressBuildingData,
	compressBuildingConnectionData,
	decompressBuildingConnectionData,
	getCompressionRatio
};
