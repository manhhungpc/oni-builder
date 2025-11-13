import * as PIXI from 'pixi.js';
import type { PlacedBuildings } from 'src/interface';
import type { ConduitNode } from 'src/interface/building';
import { SvelteMap } from 'svelte/reactivity';
import { Camera } from '$lib/rendering/camera';
import { Renderer as AppRenderer } from '$lib/rendering/renderer';

export enum ConduitType {
	LIQUID = 'liquid',
	GAS = 'gas',
	WIRE = 'wire',
	LOGIC_WIRE = 'logicWire',
	CONVEYOR = 'conveyor',
	TILES = 'tiles'
}

class BlueprintState {
	pixiApp = $state<PIXI.Application<PIXI.Renderer> | null>(null);
	camera = $state<Camera>();
	gridRenderer = $state<AppRenderer>();
	buildContainer = $state<PIXI.Container | null>(null);
	isValidPlacement = $state(false);

	placedBuildings = $state<PlacedBuildings[]>([]);
	placedConduits = {
		[ConduitType.LIQUID]: new SvelteMap<string, ConduitNode>(),
		[ConduitType.GAS]: new SvelteMap<string, ConduitNode>(),
		[ConduitType.WIRE]: new SvelteMap<string, ConduitNode>(),
		[ConduitType.LOGIC_WIRE]: new SvelteMap<string, ConduitNode>(),
		[ConduitType.CONVEYOR]: new SvelteMap<string, ConduitNode>(),
		[ConduitType.TILES]: new SvelteMap<string, ConduitNode>()
	};

	addConduit(type: ConduitType, key: string, data: ConduitNode) {
		this.placedConduits[type].set(key, data);
	}

	getConduit(type: ConduitType) {
		return this.placedConduits[type];
	}

	async initPixiApp(app: PIXI.Application, canvas: HTMLCanvasElement) {
		if (!app || !canvas) return;

		// Initialize PIXI app with canvas
		await app.init({
			canvas: canvas,
			resizeTo: window,
			resolution: window.devicePixelRatio || 1,
			backgroundColor: '#2c2c2c'
		});

		this.pixiApp = app;

		// Setup container hierarchy
		const mainContainer = new PIXI.Container({ label: 'Main' });
		const buildContainer = new PIXI.Container({ label: 'Building grid' });
		buildContainer.sortableChildren = true; // Enable zIndex sorting

		app.stage.addChild(mainContainer);
		mainContainer.addChild(buildContainer);

		app.stage.eventMode = 'static';
		app.stage.hitArea = app.screen;

		// Setup camera and grid systems
		const camera = new Camera(buildContainer);
		const gridRenderer = new AppRenderer(
			buildContainer,
			camera,
			app.screen.width,
			app.screen.height
		);

		this.camera = camera;
		this.gridRenderer = gridRenderer;
		this.buildContainer = buildContainer;

		// Initial grid render
		gridRenderer.draw();
	}
}

export const blueprint = new BlueprintState();
