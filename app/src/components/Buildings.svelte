<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { blueprint } from '$lib/state/blueprint.svelte';
	import { appConfig, mousePosition, message } from '$lib/state/config.svelte';
	import Layers from 'src/components/Layers.svelte';
	import {
		liquidPorts,
		gasPorts,
		conveyorPorts,
		powerPorts,
		logicPorts
	} from '$lib/state/ports.svelte';
	import { ConduitType } from '$lib/state/blueprint.svelte';
	import { OVERLAY } from '$lib/constant';
	import { Camera } from '$lib/rendering/camera';
	import { Renderer } from '$lib/rendering/renderer';
	import { Controller } from '$lib/core/controller';
	import { ACTION, CELL_SIZE, MOUSE_CLICK, CONDUIT_TYPE, PORT } from '$lib/constant';
	import { drawBuilding } from '$lib/core/drawBuilding';
	import { dragDrawBuilding, updateGridTexture } from '$lib/core/connectConduit';
	import { previewBuilding } from '$lib/core/preview';
	import { calculateBuildingOffset, getBuildingBounds } from '$lib/core/positioning';
	import { createPlacementSprite, cleanupAttachSprite, loadSprites } from '$lib/rendering/pixi';
	import type { NodeData, PlacementState } from 'src/interface/building';
	import MousePopup from '$lib/ui/components/MousePopup.svelte';
	import { worldToGrid, gridToWorld } from '$lib/utils/grid/transform';
	import { getConduitList } from '$lib/utils/helpers';
	import type { IBuilding } from 'src/interface/building';
	import type { PlacedBuildings } from 'src/interface';
	import { listBuilding } from '$lib/api/buildings.api';

	interface Props {
		savedBuildings?: PlacedBuildings[];
		savedConnections?: Record<string, Map<string, NodeData>>;
	}

	let { savedBuildings, savedConnections }: Props = $props();

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let isPanning = $state(false);
	// Don't use $state for currentPlacementState to avoid reactivity issues
	let currentPlacement: PlacementState | null = null;
	let lastPanPosition = $state({ x: 0, y: 0 });

	async function initPixiApp(app: PIXI.Application) {
		if (!app || !canvasElement) return;

		await app.init({
			canvas: canvasElement,
			resizeTo: window,
			resolution: window.devicePixelRatio || 1,
			backgroundColor: '#2c2c2c'
		});

		blueprint.pixiApp = app;

		const mainContainer = new PIXI.Container({ label: 'Main' });
		const buildContainer = new PIXI.Container({ label: 'Building grid' });
		buildContainer.sortableChildren = true; // Enable zIndex sorting

		app.stage.addChild(mainContainer);
		mainContainer.addChild(buildContainer);

		// Create hover highlight graphics
		const hoverHighlight = new PIXI.Graphics();
		hoverHighlight.zIndex = 1;
		buildContainer.addChild(hoverHighlight);

		app.stage.eventMode = 'static';
		app.stage.hitArea = app.screen;

		// Setup camera and grid systems
		const camera = new Camera(buildContainer);
		const gridRenderer = new Renderer(buildContainer, camera, app.screen.width, app.screen.height);
		const controller = new Controller();

		// Store camera and buildContainer in global stores
		blueprint.camera = camera;
		blueprint.buildContainer = buildContainer;

		gridRenderer.draw();

		app.ticker.add(() => {
			const moveSpeed = appConfig.panSpeed + 4;
			let deltaX = 0,
				deltaY = 0;

			if (controller.keys.left.pressed) {
				deltaX += moveSpeed;
			}
			if (controller.keys.right.pressed) {
				deltaX -= moveSpeed;
			}
			if (controller.keys.up.pressed) {
				deltaY += moveSpeed;
			}
			if (controller.keys.down.pressed) {
				deltaY -= moveSpeed;
			}

			// Only pan and redraw if there's movement
			if (deltaX !== 0 || deltaY !== 0) {
				camera.pan(deltaX, deltaY);
				gridRenderer.draw();
			}
		});

		app.stage.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
			if (event.button === MOUSE_CLICK.LEFT) {
				// Convert screen coordinates to world coordinates
				const clickedPosition = camera.screenToWorld(event.global.x, event.global.y);

				// Convert world coordinates to grid coordinates
				const { gridX, gridY } = worldToGrid(clickedPosition);

				console.log(`Grid Position: (${gridX}, ${gridY})`);
			}
			if (event.button === MOUSE_CLICK.RIGHT) {
				isPanning = true;
				lastPanPosition = { x: event.global.x, y: event.global.y };
			}
		});

		// Mouse move for drawing and panning
		app.stage.on('pointermove', (event: PIXI.FederatedPointerEvent) => {
			const currentHoverPosition = camera.screenToWorld(event.global.x, event.global.y);
			mousePosition.x = event.global.x;
			mousePosition.y = event.global.y;

			const { gridX, gridY } = worldToGrid(currentHoverPosition);

			if (appConfig.selectedAction === ACTION.CUT && !isPanning) {
				hoverHighlight.clear();

				const worldPos = gridToWorld(gridX, gridY);
				hoverHighlight.rect(worldPos.x, worldPos.y, CELL_SIZE, CELL_SIZE);
				hoverHighlight.fill({ color: 0xff0000, alpha: 0.3 });
				hoverHighlight.visible = true;
			} else {
				hoverHighlight.visible = false;
			}

			if (isPanning) {
				const deltaX = event.global.x - lastPanPosition.x;
				const deltaY = event.global.y - lastPanPosition.y;

				camera.pan(deltaX, deltaY);
				gridRenderer.draw();

				lastPanPosition = { x: event.global.x, y: event.global.y };
			}
		});

		app.stage.on('pointerup', () => {
			isPanning = false;
		});

		app.stage.on('pointerleave', () => {
			isPanning = false;
		});

		// Zoom with mouse wheel
		app.stage.on('wheel', (event: WheelEvent) => {
			event.preventDefault();

			const scaleFactor = event.deltaY > 0 ? 1 - camera.ZOOM_STEP : 1 + camera.ZOOM_STEP;
			camera.zoomAt(event.offsetX, event.offsetY, scaleFactor);
			gridRenderer.draw();
		});

		app.renderer.on('resize', () => {
			gridRenderer.updateScreenSize(app.screen.width, app.screen.height);
		});

		canvasElement.addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});

		if (savedBuildings) {
			loadSavedBuildings(buildContainer).catch(console.error);
		}
		if (savedConnections) {
			loadSavedConnections();
		}
	}

	// Load saved buildings onto the canvas
	async function loadSavedBuildings(container: PIXI.Container) {
		if (!savedBuildings || !blueprint.pixiApp || !container) return;

		const buildingsToLoad: PlacedBuildings[] = savedBuildings;

		// Get unique building names to fetch from API
		const uniqueNames = [...new Set(buildingsToLoad.map((b) => b.display_name))];

		// Create a map of building display_name to full building data
		const buildingDataMap = new Map<string, IBuilding>();

		// Fetch building data for each unique building type
		for (const displayName of uniqueNames) {
			try {
				const buildings = await listBuilding({ search: displayName });
				const building = buildings.find((b) => b.display_name === displayName);
				if (building) {
					buildingDataMap.set(displayName, building);
				}
			} catch (error) {
				console.error(`Failed to fetch building data for ${displayName}:`, error);
			}
		}

		// Load sprites for all buildings
		const BASE_IMG_PATH = import.meta.env.VITE_IMAGE_BASE_PATH;
		const buildingsToLoadSprites = Array.from(buildingDataMap.values());
		if (buildingsToLoadSprites.length > 0) {
			await loadSprites(buildingsToLoadSprites, BASE_IMG_PATH);
		}

		// Place each building on the canvas
		for (const savedBuilding of buildingsToLoad) {
			const buildingData = buildingDataMap.get(savedBuilding.display_name);
			if (!buildingData) {
				console.warn(`Building data not found for ${savedBuilding.display_name}`);
				continue;
			}

			// Reconstruct original grid position from saved top_left
			const bound = getBuildingBounds(buildingData);
			const gridX = savedBuilding.top_left.x - bound.minX;
			const gridY = savedBuilding.top_left.y + bound.maxY;

			// Create and place the building sprite
			const buildingSprite = PIXI.Sprite.from(buildingData.name);
			const offset = calculateBuildingOffset(buildingData);

			buildingSprite.position.set((gridX + offset.x) * CELL_SIZE, (gridY + offset.y) * CELL_SIZE);
			buildingSprite.width = buildingData.width * CELL_SIZE;
			buildingSprite.height = buildingData.height * CELL_SIZE;
			buildingSprite.zIndex = savedBuilding.scene_layer;
			container.addChild(buildingSprite);

			// Add to placedBuildings array
			blueprint.placedBuildings.push(savedBuilding);

			// Reconstruct ports
			reconstructBuildingPorts(buildingData, gridX, gridY);
		}
	}

	// Load saved connections into global state
	function loadSavedConnections() {
		if (!savedConnections) return;

		// Map connection types to their corresponding global stores
		const connectionMap = {
			liquidPipes: blueprint.placedConduits[ConduitType.LIQUID],
			gasPipes: blueprint.placedConduits[ConduitType.GAS],
			wires: blueprint.placedConduits[ConduitType.WIRE],
			logicWires: blueprint.placedConduits[ConduitType.LOGIC_WIRE],
			conveyor: blueprint.placedConduits[ConduitType.CONVEYOR]
		};

		// Iterate through each connection type and populate the global stores
		for (const [connectionType, connectionData] of Object.entries(savedConnections)) {
			const globalStore = connectionMap[connectionType as keyof typeof connectionMap];

			if (globalStore && connectionData) {
				// Clear existing connections
				globalStore.clear();

				// Populate with saved connections
				connectionData.forEach((nodeData: NodeData, key: string) => {
					globalStore.set(key, nodeData);
				});
			}
		}
	}

	// Reconstruct port connections for a building
	function reconstructBuildingPorts(building: IBuilding, gridX: number, gridY: number) {
		// Handle conduit ports (liquid/gas)
		if (building.conduit) {
			if (
				building.conduit.input_type !== undefined &&
				building.conduit.input_type !== null &&
				building.conduit.input_offset
			) {
				const inputX = gridX + building.conduit.input_offset.x;
				const inputY = gridY - building.conduit.input_offset.y; // Correct: minus for y-axis flip
				const key = `${inputX},${inputY}`;

				if (building.conduit.input_type === CONDUIT_TYPE.LIQUID) {
					liquidPorts.set(key, PORT.INPUT);
				} else if (building.conduit.input_type === CONDUIT_TYPE.GAS) {
					gasPorts.set(key, PORT.INPUT);
				}
			}

			if (
				building.conduit.output_type !== undefined &&
				building.conduit.output_type !== null &&
				building.conduit.output_offset
			) {
				const outputX = gridX + building.conduit.output_offset.x;
				const outputY = gridY - building.conduit.output_offset.y; // Correct: minus for y-axis flip
				const key = `${outputX},${outputY}`;

				if (building.conduit.output_type === CONDUIT_TYPE.LIQUID) {
					liquidPorts.set(key, PORT.OUTPUT);
				} else if (building.conduit.output_type === CONDUIT_TYPE.GAS) {
					gasPorts.set(key, PORT.OUTPUT);
				}
			}
		}

		// Handle power ports
		if (building.power_port) {
			if (building.power_port.input_offset) {
				const inputX = gridX + building.power_port.input_offset.x;
				const inputY = gridY - building.power_port.input_offset.y; // Correct: minus for y-axis flip
				powerPorts.set(`${inputX},${inputY}`, PORT.INPUT);
			}

			if (building.power_port.output_offset) {
				const outputX = gridX + building.power_port.output_offset.x;
				const outputY = gridY - building.power_port.output_offset.y; // Correct: minus for y-axis flip
				powerPorts.set(`${outputX},${outputY}`, PORT.OUTPUT);
			}
		}

		// Handle logic ports
		if (building.logic_port && building.logic_port.length > 0) {
			for (const port of building.logic_port) {
				const portX = gridX + port.offset.x;
				const portY = gridY - port.offset.y; // Correct: minus for y-axis flip
				const portType = port.type === 'input' ? PORT.INPUT : PORT.OUTPUT;
				logicPorts.set(`${portX},${portY}`, portType);
			}
		}
	}

	$effect(() => {
		if (!canvasElement) return;

		// Only create PIXI app in browser environment
		if (typeof window === 'undefined') return;

		const app = new PIXI.Application();
		//@ts-ignore
		globalThis.__PIXI_APP__ = app;

		initPixiApp(app).catch(console.error);

		return () => {
			isPanning = false;

			if (blueprint.pixiApp) {
				blueprint.pixiApp.destroy(true, { children: true, texture: true });
				// blueprint.pixiApp = null;
				console.log('Pixi cleared');
			}
		};
	});

	// Handle building placement and preview
	$effect(() => {
		const app = blueprint.pixiApp;
		const camera = blueprint.camera;
		const selectedToBuild = appConfig.selectedToBuild;
		const container = blueprint.buildContainer;
		if (!selectedToBuild || !app || !camera || !container) {
			if (currentPlacement && app && container) {
				cleanupAttachSprite(currentPlacement, container, app);
				currentPlacement = null;
			}
			return;
		}

		// Clean up previous placement state if exists
		if (currentPlacement) {
			cleanupAttachSprite(currentPlacement, container, app);
		}

		const sprite = createPlacementSprite(selectedToBuild, container, {
			zIndex: 999
		});

		const offset = calculateBuildingOffset(selectedToBuild);

		const previewState = previewBuilding(sprite, selectedToBuild, camera, offset);

		const placementState = drawBuilding(sprite, selectedToBuild, container, camera, {
			onCancel: () => {
				appConfig.selectedToBuild = null;
			}
		});

		currentPlacement = {
			sprite: sprite,
			previewContainer: previewState.previewContainer,
			mouseMoveHandler: previewState.mouseMoveHandler,
			clickHandler: placementState.clickHandler
		};

		// Attach handlers
		if (previewState.mouseMoveHandler) {
			app.stage.on('pointermove', previewState.mouseMoveHandler);
		}
		if (placementState.clickHandler) {
			if (appConfig.selectedToBuild?.is_drag_build || selectedToBuild.special_texture.length > 0)
				return () => {
					if (currentPlacement && app && container) {
						cleanupAttachSprite(currentPlacement, container, app);
						currentPlacement = null;
					}
				};

			app.stage.on('pointerdown', placementState.clickHandler);
		}

		return () => {
			if (currentPlacement && app && container) {
				cleanupAttachSprite(currentPlacement, container, app);
				currentPlacement = null;
			}
		};
	});

	// Handle special building with "is_drag_build" is true and "special_texture" is not empty array
	let selectedBuilding: IBuilding | Partial<IBuilding> | null = $state(null);
	// $inspect(selectedBuilding);
	$effect(() => {
		const app = blueprint.pixiApp;
		const camera = blueprint.camera;
		selectedBuilding = appConfig.selectedToBuild;

		if (!app || !camera) {
			return;
		}

		// Only handle drag-to-build buildings or when in CUT mode
		if (
			appConfig.selectedAction !== ACTION.CUT &&
			(!selectedBuilding?.is_drag_build || !selectedBuilding?.special_texture?.length)
		) {
			return;
		}

		let conduitList = getConduitList();

		if (appConfig.selectedAction == ACTION.CUT) {
			conduitList = getConduitList(appConfig.selectedOverlay);
		}

		if (!conduitList) {
			throw new Error('Unknow conduit list');
		}

		// Get drag handlers
		const dragHandlers = dragDrawBuilding(camera, conduitList, selectedBuilding, {
			onConnect: (fromGrid, toGrid) => {
				if (appConfig.selectedAction == ACTION.BUILD) {
					updateGridTexture(selectedBuilding, fromGrid, conduitList);
					updateGridTexture(selectedBuilding, toGrid, conduitList);
				} else if (appConfig.selectedAction == ACTION.CUT) {
					const key = `${fromGrid.x},${fromGrid.y}`;
					const nodeData = conduitList.get(key);
					if (nodeData && nodeData.metadata) {
						const cutBuilding = {
							name: nodeData.metadata.name,
							display_name: nodeData.metadata.displayName
						};
						updateGridTexture(cutBuilding, fromGrid, conduitList);
						updateGridTexture(cutBuilding, toGrid, conduitList);
					}
				}
			}
		});

		const handlePointerDown = (event: PIXI.FederatedPointerEvent) => {
			dragHandlers.startDrag(event);
		};

		const handlePointerMove = (event: PIXI.FederatedPointerEvent) => {
			dragHandlers.moveDrag(event);
		};

		const handlePointerUp = () => {
			dragHandlers.endDrag();
		};

		// Attach handlers
		app.stage.on('pointerdown', handlePointerDown);
		app.stage.on('pointermove', handlePointerMove);
		app.stage.on('pointerup', handlePointerUp);
		// app.stage.on('pointerleave', handlePointerLeave);

		return () => {
			app.stage?.removeEventListener('pointerdown', handlePointerDown);
			app.stage?.removeEventListener('pointermove', handlePointerMove);
			app.stage?.removeEventListener('pointerup', handlePointerUp);
			app.stage?.removeEventListener('pointerleave', handlePointerUp);
			dragHandlers.endDrag();
		};
	});
</script>

<div class="grid-wrapper">
	{#if !canvasElement}
		<p>Loading Canvas...</p>
	{/if}
	<canvas bind:this={canvasElement}></canvas>
	<Layers
		overlayType={OVERLAY.POWER}
		ports={powerPorts}
		connections={blueprint.placedConduits[ConduitType.WIRE]}
		containerLabel="Power Wires"
	/>
	<Layers
		overlayType={OVERLAY.PLUMBING}
		ports={liquidPorts}
		connections={blueprint.placedConduits[ConduitType.LIQUID]}
		containerLabel="Liquid Pipes"
	/>
	<Layers
		overlayType={OVERLAY.VENTILATION}
		ports={gasPorts}
		connections={blueprint.placedConduits[ConduitType.GAS]}
		containerLabel="Gas Pipes"
	/>
	<Layers
		overlayType={OVERLAY.AUTOMATION}
		ports={logicPorts}
		connections={blueprint.placedConduits[ConduitType.LOGIC_WIRE]}
		containerLabel="Automation"
	/>
	<Layers
		overlayType={OVERLAY.SHIPPING}
		ports={conveyorPorts}
		connections={blueprint.placedConduits[ConduitType.CONVEYOR]}
		containerLabel="Conveyor"
	/>
	{#if message.popup && !blueprint.isValidPlacement}
		<MousePopup content={message.popup} {mousePosition} />
	{/if}
</div>

<style>
	.grid-wrapper {
		position: relative;
		display: flex;
		width: 100vw;
		height: 100vh;
		overflow: auto;
	}

	canvas {
		overflow: auto;
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
