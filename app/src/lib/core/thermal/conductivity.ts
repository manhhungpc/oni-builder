export type KMethod = 'minimum' | 'geometric' | 'average' | 'product';

export function applicableTC(k1: number, k2: number, method: KMethod): number {
	switch (method) {
		case 'minimum':
			return Math.min(k1, k2);
		case 'geometric':
			return Math.sqrt(k1 * k2);
		case 'average':
			return (k1 + k2) / 2;
		case 'product':
			return (k1 * k2) / 2;
	}
}
