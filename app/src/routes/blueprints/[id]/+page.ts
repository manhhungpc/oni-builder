import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getBlueprintByShareId } from '$lib/api/blueprints.api';
import {
	decompressBuildingData,
	decompressBuildingConnectionData
} from '$lib/blueprint-data/compress';

export const load: PageLoad = async ({ params }) => {
	const response = await getBlueprintByShareId(params.id);

	if (!response.success || !response.data) {
		error(404, 'Blueprint not found');
	}

	const decompressedBuildings = decompressBuildingData({
		buildings: response.data.buildings
	});

	const decompressedConnections: Record<string, any> = {};
	if (response.data.connections) {
		for (const [key, value] of Object.entries(response.data.connections)) {
			if (value) {
				decompressedConnections[key] = decompressBuildingConnectionData(value);
			}
		}
	}

	return {
		...response.data,
		buildings: decompressedBuildings,
		connections: decompressedConnections
	};
};
