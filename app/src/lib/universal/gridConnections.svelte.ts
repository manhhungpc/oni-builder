import { SvelteMap } from 'svelte/reactivity';

export const pipesConnection = new SvelteMap<string, string[]>();
export const wiresConnection = new SvelteMap<string, string[]>();
export const tilesConnection = new SvelteMap<string, string[]>();
export const conveyorConnection = new SvelteMap<string, string[]>();
