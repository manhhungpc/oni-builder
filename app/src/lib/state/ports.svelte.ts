import type { PORT } from 'src/lib/constant';
import { SvelteMap } from 'svelte/reactivity';

export const liquidPorts = new SvelteMap<string, PORT>();
export const gasPorts = new SvelteMap<string, PORT>();
export const powerPorts = new SvelteMap<string, PORT>();
export const logicPorts = new SvelteMap<string, PORT>();
export const conveyorPorts = new SvelteMap<string, PORT>();
