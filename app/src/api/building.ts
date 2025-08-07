import { fetchAPI } from './index';
import type { IBuilding, QueryBuildings } from '@shared/src/interface';

export async function listBuilding(params: QueryBuildings): Promise<IBuilding[]> {
    return fetchAPI<IBuilding[]>('/api/buildings', { params });
}
