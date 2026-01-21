import * as PIXI from 'pixi.js';
import type { PlacedBuildings } from 'src/interface';
import type { ConduitNode, GridNodeData } from 'src/interface/building';
import { SvelteMap } from 'svelte/reactivity';
import { Camera } from '$lib/rendering/camera';
import { Renderer as AppRenderer } from '$lib/rendering/renderer';
import { CELL_SIZE, OVERLAY, PORT } from '$lib/constant';
import { appConfig } from './config.svelte';

export enum ConduitType {
	LIQUID = 'liquid',
	GAS = 'gas',
	WIRE = 'wire',
	LOGIC_WIRE = 'logicWire',
	CONVEYOR = 'conveyor'
}

class BlueprintState {
	pixiApp = $state<PIXI.Application<PIXI.Renderer> | null>(null);
	camera = $state<Camera>();
	gridRenderer = $state<AppRenderer>();
	buildContainer = $state<PIXI.Container | null>(null);
	isValidPlacement = $state(false);
	boundaryGraphics = $state<PIXI.Graphics | null>(null);

	placedBuildings = $state<PlacedBuildings[]>([]);
	placedConduits = {
		[ConduitType.LIQUID]: new SvelteMap<string, ConduitNode>(),
		[ConduitType.GAS]: new SvelteMap<string, ConduitNode>(),
		[ConduitType.WIRE]: new SvelteMap<string, ConduitNode>(),
		[ConduitType.LOGIC_WIRE]: new SvelteMap<string, ConduitNode>(),
		[ConduitType.CONVEYOR]: new SvelteMap<string, ConduitNode>()
	};
	placedTiles = new SvelteMap<string, GridNodeData>();

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
		const buildContainer = new PIXI.Container({ label: 'Building' });
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

	getPortsByCategory(category: OVERLAY): Map<string, PORT> {
		const allPorts = new Map<string, PORT>();

		for (const building of this.placedBuildings) {
			if (building.ports) {
				for (const port of building.ports) {
					if (port.category === category) {
						const absX = building.top_left.x + port.offset.x;
						const absY = building.top_left.y + port.offset.y;
						const absoluteKey = `${absX},${absY}`;
						allPorts.set(absoluteKey, port.direction);
					}
				}
			}
		}

		return allPorts;
	}

	drawBoundaryBoxes(): void {
		if (!this.buildContainer) return;

		if (!this.boundaryGraphics) {
			this.boundaryGraphics = new PIXI.Graphics({ label: 'Boundary Boxes' });
			this.boundaryGraphics.zIndex = 1000;
			this.buildContainer.addChild(this.boundaryGraphics);
		}

		this.boundaryGraphics.clear();

		for (const building of this.placedBuildings) {
			const x = building.top_left.x * CELL_SIZE;
			const y = building.top_left.y * CELL_SIZE;
			const width = (building.bottom_right.x - building.top_left.x + 1) * CELL_SIZE;
			const height = (building.bottom_right.y - building.top_left.y + 1) * CELL_SIZE;

			this.boundaryGraphics.rect(x, y, width, height);
			this.boundaryGraphics.stroke({ width: 2, color: 0xff0000 });
		}
	}

	clearBoundaryBoxes(): void {
		this.boundaryGraphics?.clear();
	}

	removeBuilding(building: PlacedBuildings) {
		building.sprite?.destroy();

		if (building.ports) {
			for (const port of building.ports) {
				port.sprite?.destroy();
			}
		}

		// Remove from array
		const index = this.placedBuildings.indexOf(building);
		if (index > -1) {
			this.placedBuildings.splice(index, 1);
		}

		if (appConfig.devMode) {
			this.drawBoundaryBoxes();
		}
	}
}

export const blueprint = new BlueprintState();
