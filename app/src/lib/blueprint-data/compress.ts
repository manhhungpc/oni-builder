import { compress, decompress, type Compressed } from 'compress-json';
import type { PlacedBuildings } from 'src/interface';
import type { ConduitNode } from 'src/interface/building';
import type { CompressedCanvasData } from 'src/interface/compressData';

function compressBuildingData(buildings: PlacedBuildings[]): Compressed {
	// Remove sprite references before compression as they can't be serialized
	const serializeBuildings = buildings.map((building) => {
		const { sprite, ports, ...buildingData } = building;

		const portsWithoutSprites = ports?.map(({ sprite: portSprite, ...portData }) => portData);

		return {
			...buildingData,
			ports: portsWithoutSprites
		};
	});

	return compress(serializeBuildings);
}

function compressBuildingConnectionData(connections: Map<string, ConduitNode>): Compressed {
	const serializeConnections: { [key: string]: ConduitNode } = {};

	connections.forEach((node, key) => {
		const { metadata, ...nodeData } = node;

		const { sprite, ...metadataWithoutSprite } = metadata || {};

		serializeConnections[key] = {
			...nodeData,
			metadata: metadataWithoutSprite
		};
	});

	return compress(serializeConnections);
}

function decompressBuildingConnectionData(compressedData: Compressed): Map<string, ConduitNode> {
	try {
		const decompressedData = decompress(compressedData) as { [key: string]: ConduitNode };
		const connections = new Map<string, ConduitNode>();

		Object.entries(decompressedData).forEach(([key, node]) => {
			connections.set(key, node);
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

function decompressBuildingData(compressedData: CompressedCanvasData): PlacedBuildings[] {
	try {
		if (!compressedData.buildings) {
			throw new Error('Invalid canvas data format');
		}

		const decompressedBuildings = decompress(compressedData.buildings) as PlacedBuildings[];

		return decompressedBuildings;
	} catch (error) {
		throw new Error(
			`Failed to decompress canvas data: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		);
	}
}

export {
	compressBuildingData,
	decompressBuildingData,
	compressBuildingConnectionData,
	decompressBuildingConnectionData
};
