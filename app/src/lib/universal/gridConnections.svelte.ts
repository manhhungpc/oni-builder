import type { NodeData } from 'src/interface/building';
import { SvelteMap } from 'svelte/reactivity';

export const pipesConnection = new SvelteMap<string, NodeData>();
export const wiresConnection = new SvelteMap<string, NodeData>();
export const tilesConnection = new SvelteMap<string, NodeData>();
export const conveyorConnection = new SvelteMap<string, NodeData>();
export const otherConnection = new SvelteMap<string, NodeData>();
