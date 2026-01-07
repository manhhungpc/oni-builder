import { fetchAPI } from './index';
import type { ApiResponse, PaginatedResponse } from 'src/interface/api';
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
	guestId?: string;
}

export interface CreateBlueprintData {
	id: string;
	shareId: string;
	name: string;
	createdAt: string;
}

export interface GetBlueprintData {
	id: string;
	shareId: string;
	name: string;
	buildings: Compressed;
	connections?: BlueprintConnections;
	createdAt: string;
	updatedAt: string;
	viewCount: number;
}

export interface MigrateBlueprintsData {
	migratedCount: number;
}

export interface BlueprintSummary {
	id: string;
	shareId: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface UpdateBlueprintData {
	id: string;
	shareId: string;
	name: string;
	updatedAt: string;
}

export async function createSharedBlueprint(
	data: CreateBlueprintRequest
): Promise<ApiResponse<CreateBlueprintData>> {
	return fetchAPI<ApiResponse<CreateBlueprintData>>('/api/blueprints', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
}

export async function getBlueprintByShareId(
	shareId: string
): Promise<ApiResponse<GetBlueprintData>> {
	return fetchAPI<ApiResponse<GetBlueprintData>>(`/api/blueprints/${shareId}`);
}

export async function migrateGuestBlueprints(
	guestId: string
): Promise<ApiResponse<MigrateBlueprintsData>> {
	return fetchAPI<ApiResponse<MigrateBlueprintsData>>('/api/blueprints/migrate', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include',
		body: JSON.stringify({ guestId })
	});
}

export async function getMyBlueprints(
	page: number = 1,
	limit: number = 10
): Promise<PaginatedResponse<BlueprintSummary>> {
	return fetchAPI<PaginatedResponse<BlueprintSummary>>(
		`/api/blueprints/my-collection?page=${page}&limit=${limit}`,
		{
			credentials: 'include'
		}
	);
}

export async function updateBlueprint(
	shareId: string,
	name: string
): Promise<ApiResponse<UpdateBlueprintData>> {
	return fetchAPI<ApiResponse<UpdateBlueprintData>>(`/api/blueprints/${shareId}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include',
		body: JSON.stringify({ name })
	});
}
