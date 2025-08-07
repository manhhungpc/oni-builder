import {
    otherConnection,
    liquidPipesConnection,
    gasPipesConnection,
    wiresConnection,
    logicWiresConnection,
    conveyorConnection,
} from 'src/lib/universal/connections.svelte';
import { globalState } from 'src/lib/universal/globalState.svelte';
import { CATEGORY } from 'src/lib/constant';
import type { NodeData } from 'src/interface/building';
import type { SvelteMap } from 'svelte/reactivity';
import { OVERLAY } from '@shared/src/enum';

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

const CONNECTION_TYPE_MAP = {
    [OVERLAY.PLUMBING]: liquidPipesConnection,
    [OVERLAY.VENTILATION]: gasPipesConnection,
    [OVERLAY.POWER]: wiresConnection,
    [OVERLAY.AUTOMATION]: logicWiresConnection,
    [OVERLAY.SHIPPING]: conveyorConnection,
    [CATEGORY.PLUMBING]: liquidPipesConnection,
    [CATEGORY.VENTILATION]: gasPipesConnection,
    [CATEGORY.POWER]: wiresConnection,
    [CATEGORY.AUTOMATION]: logicWiresConnection,
    [CATEGORY.SHIPPING]: conveyorConnection,
};

export function getConnectionListType(overlays?: OVERLAY): SvelteMap<string, NodeData> {
    if (overlays) {
        return CONNECTION_TYPE_MAP[overlays] || otherConnection;
    }

    const selectedBuilding = globalState.selectedBuilding;
    const category = selectedBuilding?.category;

    return category ? CONNECTION_TYPE_MAP[category] || otherConnection : otherConnection;
}
