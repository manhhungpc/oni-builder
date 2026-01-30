import { fetchAPI } from './index';
import type { IElement } from 'src/interface/element';
import type { QueryElements } from '@shared/src/interface';

export async function listElements(params?: QueryElements): Promise<IElement[]> {
	return fetchAPI<IElement[]>('/api/elements', { params });
}
