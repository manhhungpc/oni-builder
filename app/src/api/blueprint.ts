import { fetchAPI } from './index';
import type { Compressed } from 'compress-json';

export interface BlueprintConnections {
    liquidPipes?: Compressed | null;
    gasPipes?: Compressed | null;
    wires?: Compressed | null;
    logicWires?: Compressed | null;
    tiles?: Compressed | null;
    conveyor?: Compressed | null;
    other?: Compressed | null;
}

export interface CreateBlueprintRequest {
    name: string;
    buildings: Compressed;
    connections?: BlueprintConnections;
}

export interface CreateBlueprintResponse {
    success: boolean;
    data: {
        id: string;
        shareId: string;
        name: string;
        createdAt: string;
    };
}

export interface GetBlueprintResponse {
    success: boolean;
    data: {
        id: string;
        shareId: string;
        name: string;
        buildings: Compressed;
        connections?: BlueprintConnections;
        createdAt: string;
        updatedAt: string;
        viewCount: number;
    };
}

export async function createSharedBlueprint(
    data: CreateBlueprintRequest
): Promise<CreateBlueprintResponse> {
    return fetchAPI<CreateBlueprintResponse>('/api/blueprints', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
}

export async function getBlueprintByShareId(shareId: string): Promise<GetBlueprintResponse> {
    if (!shareId) {
        throw new Error('Share ID is required');
    }

    return fetchAPI<GetBlueprintResponse>(`/api/blueprints/${shareId}`);
}
