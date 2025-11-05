import { fetchAPI } from './index';
import type { IBuilding } from 'src/interface/building';
import type { QueryBuildings } from '@shared/src/interface';

export async function listBuilding(params: QueryBuildings): Promise<IBuilding[]> {
    return fetchAPI<IBuilding[]>('/api/buildings', { params });
}
