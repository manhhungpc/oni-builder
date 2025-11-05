import { Container, type Application, type Renderer } from 'pixi.js';
import type { PlacedBuildings } from 'src/interface';
import type { IBuilding, NodeData } from 'src/interface/building';
import { ACTION } from 'src/lib/constant';
import { SvelteMap } from 'svelte/reactivity';
import type { Camera } from '$lib/rendering/camera';

export enum ConduitType {
	LIQUID = 'liquid',
	GAS = 'gas',
	WIRE = 'wire',
	LOGIC_WIRE = 'logicWire',
	CONVEYOR = 'conveyor',
	TILES = 'tiles'
}

class BlueprintState {
	pixiApp = $state<Application<Renderer> | null>(null);
	camera = $state<Camera>();
	buildContainer = $state<Container | null>(null);
	isValidPlacement = $state(false);

	// selectedAction = $state(ACTION.SELECT);
	// selectedOverlay = $state(0);

	// selectedBuilding = $state<null | IBuilding>(null);
	placedBuildings = $state<PlacedBuildings[]>([]);
	placedConduits = {
		[ConduitType.LIQUID]: new SvelteMap<string, NodeData>(),
		[ConduitType.GAS]: new SvelteMap<string, NodeData>(),
		[ConduitType.WIRE]: new SvelteMap<string, NodeData>(),
		[ConduitType.LOGIC_WIRE]: new SvelteMap<string, NodeData>(),
		[ConduitType.CONVEYOR]: new SvelteMap<string, NodeData>(),
		[ConduitType.TILES]: new SvelteMap<string, NodeData>()
	};

	addConduit(type: ConduitType, key: string, data: NodeData) {
		this.placedConduits[type].set(key, data);
	}

	getConduit(type: ConduitType) {
		return this.placedConduits[type];
	}
}

export const blueprint = new BlueprintState();
