import { blueprint, ConduitType } from '$lib/state/blueprint.svelte';
import { appConfig } from '$lib/state/config.svelte';
import { CATEGORY } from '$lib/constant';
import type { ConduitNode } from 'src/interface/building';
import type { SvelteMap } from 'svelte/reactivity';
import { OVERLAY } from '$lib/constant';
import { browser } from '$app/environment';

export function debounce<T extends (...args: any[]) => any>(
	func: T,
	delay: number = 300
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout | null = null;

	return function (...args: Parameters<T>): void {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			func(...args);
		}, delay);
	};
}

export function getAliasFromPath(path: string) {
	// Get file name (alias) from special_texture in Building
	const filename = path.split('/').pop();
	if (!filename) return '';
	return filename.split('.').slice(0, -1).join('.');
}

export function getConduitList(overlays?: OVERLAY): SvelteMap<string, ConduitNode> | null {
	const type = overlays ?? appConfig.selectedToBuild?.category;

	switch (type) {
		case OVERLAY.PLUMBING:
		case CATEGORY.PLUMBING:
			return blueprint.placedConduits[ConduitType.LIQUID];
		case OVERLAY.VENTILATION:
		case CATEGORY.VENTILATION:
			return blueprint.placedConduits[ConduitType.GAS];
		case OVERLAY.POWER:
		case CATEGORY.POWER:
			return blueprint.placedConduits[ConduitType.WIRE];
		case OVERLAY.AUTOMATION:
		case CATEGORY.AUTOMATION:
			return blueprint.placedConduits[ConduitType.LOGIC_WIRE];
		case OVERLAY.SHIPPING:
		case CATEGORY.SHIPPING:
			return blueprint.placedConduits[ConduitType.CONVEYOR];
		default:
			return blueprint.placedConduits[ConduitType.TILES];
	}
}

export function createLocalGuest(): string {
	const guestId = crypto.randomUUID();
	localStorage.setItem('guest-id', guestId);
	return guestId;
}

export function getLocalGuest(): string | null {
	if (!browser) return null;

	return localStorage.getItem('guest-id');
}
