import {
    otherConnection,
    pipesConnection,
    wiresConnection,
} from 'src/lib/universal/gridConnections.svelte';
import { globalState } from 'src/lib/universal/globalState.svelte';
import { CATEGORY } from 'src/lib/constant';
import type { NodeData } from 'src/interface/building';
import type { SvelteMap } from 'svelte/reactivity';

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

export function getAliasFromUrl(url: string) {
    // Get file name (alias) from special_texture in Building
    const filename = url.split('/').pop();
    if (!filename) return '';
    return filename.split('.').slice(0, -1).join('.');
}

export function getConnectionListType(): SvelteMap<string, NodeData> {
    let connectionList: SvelteMap<string, NodeData>;
    const selectedBuilding = globalState.selectedBuilding;

    switch (selectedBuilding?.category) {
        case CATEGORY.PLUMBING:
        case CATEGORY.VENTILATION:
            connectionList = pipesConnection;
            break;
        case CATEGORY.POWER:
        case CATEGORY.AUTOMATION:
            connectionList = wiresConnection;
            break;
        default:
            connectionList = otherConnection;
            break;
    }

    return connectionList;
}
