import type { NodeData } from 'src/interface/building';
import { SvelteMap } from 'svelte/reactivity';

export const liquidPipesConnection = new SvelteMap<string, NodeData>();
export const gasPipesConnection = new SvelteMap<string, NodeData>();
export const wiresConnection = new SvelteMap<string, NodeData>();
export const logicWiresConnection = new SvelteMap<string, NodeData>();
export const tilesConnection = new SvelteMap<string, NodeData>();
export const conveyorConnection = new SvelteMap<string, NodeData>();
export const otherConnection = new SvelteMap<string, NodeData>();
