<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { blueprint } from '$lib/state/blueprint.svelte';
	import { appConfig, mousePosition, message } from '$lib/state/config.svelte';
	import Layers from 'src/components/Layers.svelte';
	import { ConduitType } from '$lib/state/blueprint.svelte';
	import { OVERLAY, PORT, CELL_SIZE } from '$lib/constant';
	import { Controller, getNextOrientation } from '$lib/core/controller';
	import { ACTION, MOUSE_CLICK } from '$lib/constant';
	import { drawBuilding } from '$lib/core/drawBuilding';
	import { dragDrawConduit, updateConduitTexture } from '$lib/core/connectConduit';
	import { clickPlaceTile } from '$lib/core/connectTile';
	import { dragPlaceBuilding } from '$lib/core/dragBuilding';
	import { BUILD_RULE } from '$lib/constant';
	import { previewBuilding, updatePreviewOrientation } from '$lib/core/preview';
	import { calculateBuildingOffset } from '$lib/core/positioning';
	import { createPlacementSprite, cleanupAttachSprite } from '$lib/rendering/pixi';
	import type { ConduitNode, PlacementState } from 'src/interface/building';
	import MousePopup from '$lib/ui/components/MousePopup.svelte';
	import { worldToGrid } from '$lib/utils/grid/transform';
	import { getConduitList } from '$lib/utils/helpers';
	import type { IBuilding } from 'src/interface/building';
	import type { PlacedBuildings } from 'src/interface';
	import { loadSavedBuildings, loadSavedConduits } from '$lib/blueprint-data/loader';
	import {
		checkBuildingBoundary,
		createDeleteHighlight,
		previewPaintElement,
		clearPaintHighlight
	} from 'src/lib/utils';
	import { paintElementHandlers, loadElementIcons } from '$lib/core/paintElement';
	import { getItemsAtGridPosition, type GridQueryResult } from '$lib/utils/grid/query';
	import { pipeFlowState } from '$lib/state/flowSimulation.svelte';
	import { thermalSimState } from '$lib/state/thermalSimulation.svelte';
	import { renderFilledPipes, renderDirectionArrows } from '$lib/core/simulation/flow/renderer';
	import { hasConduit } from '$lib/core/simulation/flow/helpers';
	import { rgbaToHex } from '$lib/utils/color';

	interface Props {
		savedBuildings?: PlacedBuildings[];
		savedConnections?: Record<string, Map<string, ConduitNode>>;
	}

	let { savedBuildings, savedConnections }: Props = $props();

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let isPanning = $state(false);
	// Don't use $state for currentPlacementState to avoid reactivity issues
	let currentPlacement: PlacementState | null = null;
	let lastPanPosition = $state({ x: 0, y: 0 });
	let currentOrientation = $state(0);
	let previousPreview: IBuilding | null = $state(null);

	// SELECT mode hover state
	let selectModeHoverResult = $state<GridQueryResult | null>(null);
	let selectModeGridPosition = $state<{ x: number; y: number } | null>(null);

	// Derived state for type-safe template rendering
	const showSelectPopup = $derived(
		appConfig.selectedAction === ACTION.SELECT &&
			selectModeHoverResult !== null &&
			selectModeGridPosition !== null &&
			!selectModeHoverResult.isEmpty
	);

	async function initPixiApp(app: PIXI.Application) {
		if (!app || !canvasElement) return;

		// Initialize PIXI app through centralized state management
		await blueprint.initPixiApp(app, canvasElement);

		// Load element icons for paint mode
		await loadElementIcons();

		const camera = blueprint.camera;
		const gridRenderer = blueprint.gridRenderer;
		const buildContainer = blueprint.buildContainer;

		if (!camera || !gridRenderer || !buildContainer) return;

		const controller = new Controller();

		controller.onRotate = () => {
			const selectedBuilding = appConfig.selectedToBuild;
			if (appConfig.selectedAction === ACTION.BUILD && selectedBuilding) {
				const nextOrientation = getNextOrientation(
					currentOrientation,
					selectedBuilding.rotation_permit ?? 0
				);
				currentOrientation = nextOrientation;
			}
		};

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
				if (appConfig.selectedAction === ACTION.DELETE) {
					for (let placedBuilding of blueprint.placedBuildings) {
						const isDeleting = checkBuildingBoundary({ x: gridX, y: gridY }, placedBuilding);
						if (isDeleting) {
							// Use the new method that handles building and port sprite cleanup
							blueprint.removeBuilding(placedBuilding);
							break;
						}
					}
				}
			}
			if (event.button === MOUSE_CLICK.RIGHT) {
				isPanning = true;
				lastPanPosition = { x: event.global.x, y: event.global.y };
			}
		});

		// Mouse move for drawing and panning
		app.stage.on('pointermove', (event: PIXI.FederatedPointerEvent) => {
			mousePosition.x = event.global.x;
			mousePosition.y = event.global.y;

			if (isPanning) {
				const deltaX = event.global.x - lastPanPosition.x;
				const deltaY = event.global.y - lastPanPosition.y;

				camera.pan(deltaX, deltaY);
				gridRenderer.draw();

				lastPanPosition = { x: event.global.x, y: event.global.y };
			} else {
				// if (appConfig.selectedAction === ACTION.DELETE) {
				createDeleteHighlight(event);
				// }
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

			const scale = event.deltaY > 0 ? -camera.ZOOM_STEP : +camera.ZOOM_STEP;
			camera.zoomAt(event.offsetX, event.offsetY, scale);

			const updatedZoomLevel = appConfig.zoomLevel + scale * 100;
			if (updatedZoomLevel > 50 && updatedZoomLevel <= 150) {
				appConfig.zoomLevel = updatedZoomLevel;
			}
			gridRenderer.draw();
		});

		app.renderer.on('resize', () => {
			gridRenderer.updateScreenSize(app.screen.width, app.screen.height);
		});

		canvasElement.addEventListener('contextmenu', (e) => {
			e.preventDefault();
		});

		if (savedBuildings) {
			loadSavedBuildings(buildContainer, savedBuildings).catch(console.error);
		}
		if (savedConnections) {
			loadSavedConduits(savedConnections);
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

	// Handle building SELECTION (creates preview)
	$effect(() => {
		const app = blueprint.pixiApp;
		const selectedToBuild = appConfig.selectedToBuild;

		// Reset orientation when building changes
		if (selectedToBuild !== previousPreview) {
			previousPreview = selectedToBuild;
			if (selectedToBuild) {
				currentOrientation = 0;
			}
		}

		if (!selectedToBuild || !app) {
			if (currentPlacement && app) {
				cleanupAttachSprite(currentPlacement, app);
				currentPlacement = null;
			}
			return;
		}

		// Clean up previous placement state if exists
		if (currentPlacement) {
			cleanupAttachSprite(currentPlacement, app);
		}

		const sprite = createPlacementSprite(selectedToBuild, {
			zIndex: 999
		});

		const offset = calculateBuildingOffset(selectedToBuild);

		const previewState = previewBuilding(sprite, selectedToBuild, {
			offset,
			orientation: 0,
			getOrientation: () => currentOrientation
		});

		const placementState = drawBuilding(sprite, selectedToBuild, {
			getOrientation: () => currentOrientation,
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
			if (appConfig.selectedToBuild?.is_drag_build || selectedToBuild.special_texture.length > 0) {
				return () => {
					if (currentPlacement && app) {
						cleanupAttachSprite(currentPlacement, app);
						currentPlacement = null;
					}
				};
			}

			app.stage.on('pointerdown', placementState.clickHandler);
		}

		return () => {
			if (currentPlacement && app) {
				cleanupAttachSprite(currentPlacement, app);
				currentPlacement = null;
			}
		};
	});

	// Handle ORIENTATION changes
	$effect(() => {
		const selectedToBuild = appConfig.selectedToBuild;

		if (!currentPlacement?.sprite || !currentPlacement?.previewContainer || !selectedToBuild) {
			return;
		}

		const portContainer = currentPlacement.previewContainer.children.find(
			(child) => child.label === 'Port Preview'
		);

		if (!portContainer) return;

		const offset = calculateBuildingOffset(selectedToBuild);

		updatePreviewOrientation(
			currentPlacement.sprite,
			portContainer,
			selectedToBuild,
			offset,
			currentOrientation
		);
	});

	// Handle special building with "is_drag_build" is true and "special_texture" is not empty array
	let selectedBuilding: IBuilding | Partial<IBuilding> | null = $state(null);

	// Handle tile placement (build_rule === BUILD_RULE.Tile)
	$effect(() => {
		const app = blueprint.pixiApp;
		selectedBuilding = appConfig.selectedToBuild;

		if (!app) {
			return;
		}

		const isTile = selectedBuilding?.build_rule === BUILD_RULE.Tile;
		if (!isTile || !selectedBuilding?.is_drag_build || !selectedBuilding?.special_texture?.length) {
			return;
		}

		const tileHandlers = clickPlaceTile(selectedBuilding);

		const handlePointerDown = (event: PIXI.FederatedPointerEvent) => {
			tileHandlers.startDrag(event);
		};

		const handlePointerMove = (event: PIXI.FederatedPointerEvent) => {
			tileHandlers.moveDrag(event);
		};

		const handlePointerUp = () => {
			tileHandlers.endDrag();
		};

		// Attach handlers
		app.stage.on('pointerdown', handlePointerDown);
		app.stage.on('pointermove', handlePointerMove);
		app.stage.on('pointerup', handlePointerUp);

		return () => {
			app.stage?.removeEventListener('pointerdown', handlePointerDown);
			app.stage?.removeEventListener('pointermove', handlePointerMove);
			app.stage?.removeEventListener('pointerup', handlePointerUp);
			tileHandlers.endDrag();
		};
	});

	// Handle conduit placement (pipes, wires, etc.)
	$effect(() => {
		const app = blueprint.pixiApp;
		selectedBuilding = appConfig.selectedToBuild;

		if (!app) {
			return;
		}

		// Skip if it's a tile building
		const isTile = selectedBuilding?.build_rule === BUILD_RULE.Tile;

		// Only handle drag-to-build conduits or when in CUT mode
		if (
			appConfig.selectedAction !== ACTION.CUT &&
			(isTile || !selectedBuilding?.is_drag_build || !selectedBuilding?.special_texture?.length)
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
		const dragHandlers = dragDrawConduit(selectedBuilding, {
			onConnect: (fromGrid, toGrid) => {
				if (appConfig.selectedAction == ACTION.BUILD) {
					updateConduitTexture(selectedBuilding, fromGrid, conduitList);
					updateConduitTexture(selectedBuilding, toGrid, conduitList);
				} else if (appConfig.selectedAction == ACTION.CUT) {
					const key = `${fromGrid.x},${fromGrid.y}`;
					const nodeData = conduitList.get(key);
					if (nodeData && nodeData.metadata) {
						const cutBuilding = {
							name: nodeData.metadata.name,
							display_name: nodeData.metadata.displayName
						};
						updateConduitTexture(cutBuilding, fromGrid, conduitList);
						updateConduitTexture(cutBuilding, toGrid, conduitList);
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

		return () => {
			app.stage?.removeEventListener('pointerdown', handlePointerDown);
			app.stage?.removeEventListener('pointermove', handlePointerMove);
			app.stage?.removeEventListener('pointerup', handlePointerUp);
			dragHandlers.endDrag();
		};
	});

	// Handle drag-build buildings without special_texture
	$effect(() => {
		const app = blueprint.pixiApp;
		const building = appConfig.selectedToBuild;

		if (!app || !building) {
			return;
		}

		const hasSpecialTexture = building.special_texture && building.special_texture.length > 0;
		const isTile = building.build_rule === BUILD_RULE.Tile;
		const isDragBuildNoSpecial = building.is_drag_build && !hasSpecialTexture && !isTile;

		if (!isDragBuildNoSpecial) {
			return;
		}

		const dragHandlers = dragPlaceBuilding(building, {
			getOrientation: () => currentOrientation
		});

		const handlePointerDown = (event: PIXI.FederatedPointerEvent) => {
			if (appConfig.selectedAction !== ACTION.BUILD) return;
			dragHandlers.startDrag(event);
		};

		const handlePointerMove = (event: PIXI.FederatedPointerEvent) => {
			if (appConfig.selectedAction !== ACTION.BUILD) return;
			dragHandlers.moveDrag(event);
		};

		const handlePointerUp = () => {
			dragHandlers.endDrag();
		};

		app.stage.on('pointerdown', handlePointerDown);
		app.stage.on('pointermove', handlePointerMove);
		app.stage.on('pointerup', handlePointerUp);

		return () => {
			app.stage?.removeEventListener('pointerdown', handlePointerDown);
			app.stage?.removeEventListener('pointermove', handlePointerMove);
			app.stage?.removeEventListener('pointerup', handlePointerUp);
			dragHandlers.endDrag();
		};
	});

	// Handle SELECT mode hover - show popup with items at grid position
	$effect(() => {
		const app = blueprint.pixiApp;

		if (!app || appConfig.selectedAction !== ACTION.SELECT) {
			selectModeHoverResult = null;
			selectModeGridPosition = null;
			return;
		}

		const handleSelectHover = (event: PIXI.FederatedPointerEvent) => {
			if (appConfig.selectedAction !== ACTION.SELECT || isPanning) return;

			const camera = blueprint.camera;
			if (!camera) return;

			const worldPos = camera.screenToWorld(event.global.x, event.global.y);
			const { gridX, gridY } = worldToGrid(worldPos);

			selectModeHoverResult = getItemsAtGridPosition(gridX, gridY);
			selectModeGridPosition = { x: gridX, y: gridY };
		};

		app.stage.on('pointermove', handleSelectHover);

		return () => {
			app.stage?.removeEventListener('pointermove', handleSelectHover);
			selectModeHoverResult = null;
			selectModeGridPosition = null;
		};
	});

	// Handle PAINT mode for element painting
	$effect(() => {
		const app = blueprint.pixiApp;
		const selectedElement = appConfig.selectedElement;

		if (!app || appConfig.selectedAction !== ACTION.PAINT) {
			clearPaintHighlight();
			return;
		}

		// Show preview even without element selected
		const handlePaintPreview = (event: PIXI.FederatedPointerEvent) => {
			if (appConfig.selectedAction !== ACTION.PAINT) return;
			previewPaintElement(event);
		};

		app.stage.on('pointermove', handlePaintPreview);

		// Only attach paint handlers if an element is selected
		if (!selectedElement) {
			return () => {
				app.stage?.removeEventListener('pointermove', handlePaintPreview);
				clearPaintHighlight();
			};
		}

		const handlers = paintElementHandlers(selectedElement);

		const handlePointerDown = (event: PIXI.FederatedPointerEvent) => {
			handlers.startPaint(event);
		};

		const handlePointerMove = (event: PIXI.FederatedPointerEvent) => {
			handlers.movePaint(event);
		};

		const handlePointerUp = () => {
			handlers.endPaint();
		};

		app.stage.on('pointerdown', handlePointerDown);
		app.stage.on('pointermove', handlePointerMove);
		app.stage.on('pointerup', handlePointerUp);

		return () => {
			app.stage?.removeEventListener('pointermove', handlePaintPreview);
			app.stage?.removeEventListener('pointerdown', handlePointerDown);
			app.stage?.removeEventListener('pointermove', handlePointerMove);
			app.stage?.removeEventListener('pointerup', handlePointerUp);
			handlers.endPaint();
			clearPaintHighlight();
		};
	});

	// Handle SIMULATION mode - click pipes to fill
	$effect(() => {
		const app = blueprint.pixiApp;
		const buildContainer = blueprint.buildContainer;
		const isSimMode = pipeFlowState.isSimulationMode;

		if (!app || !buildContainer || !isSimMode) {
			return;
		}

		const handleSimulationClick = (event: PIXI.FederatedPointerEvent) => {
			if (event.button !== MOUSE_CLICK.LEFT) return;
			if (!pipeFlowState.isSimulationMode) return;
			if (pipeFlowState.isRunning) return; // Don't fill while running

			const camera = blueprint.camera;
			if (!camera) return;

			const worldPos = camera.screenToWorld(event.global.x, event.global.y);
			const { gridX, gridY } = worldToGrid(worldPos);
			const gridKey = `${gridX},${gridY}`;

			// Verify position is in the conduit map for the selected element
			if (!hasConduit(gridKey)) return;

			if (pipeFlowState.fillMode === 'auto') {
				pipeFlowState.autoFill(gridKey);
			} else {
				pipeFlowState.toggleFill(gridKey);
			}
		};

		app.stage.on('pointerdown', handleSimulationClick);

		return () => {
			app.stage?.removeEventListener('pointerdown', handleSimulationClick);
		};
	});

	// Handle SIMULATION rendering updates
	$effect(() => {
		const buildContainer = blueprint.buildContainer;
		const isSimMode = pipeFlowState.isSimulationMode;
		const filledPipes = pipeFlowState.filledPipes;
		const selectedElement = pipeFlowState.selectedElement;
		const pipeDirections = pipeFlowState.pipeDirections;

		if (!buildContainer || !isSimMode) {
			return;
		}

		// Render filled pipes
		if (selectedElement) {
			renderFilledPipes(pipeFlowState.renderState, buildContainer, filledPipes, selectedElement);
		}

		// Render direction arrows when map is non-empty (after Start)
		if (pipeDirections.size > 0 && selectedElement) {
			renderDirectionArrows(pipeFlowState.renderState, buildContainer, pipeDirections);
		}
	});

	// Handle SIMULATION flow ticker
	$effect(() => {
		const app = blueprint.pixiApp;
		const isRunning = pipeFlowState.isRunning;

		if (!app || !isRunning) return;

		const tickerFn = (ticker: PIXI.Ticker) => {
			pipeFlowState.updateFlow(ticker.deltaMS);
		};
		app.ticker.add(tickerFn);

		return () => {
			app.ticker.remove(tickerFn);
		};
	});

	// Handle THERMAL simulation ticker
	$effect(() => {
		const app = blueprint.pixiApp;
		const isRunning = thermalSimState.isRunning;

		if (!app || !isRunning) return;

		const tickerFn = (ticker: PIXI.Ticker) => {
			thermalSimState.update(ticker.deltaMS);
		};
		app.ticker.add(tickerFn);

		return () => {
			app.ticker.remove(tickerFn);
		};
	});
</script>

<div class="grid-wrapper">
	{#if !canvasElement}
		<p>Loading Canvas...</p>
	{/if}
	<canvas bind:this={canvasElement}></canvas>
	<Layers overlayType={OVERLAY.POWER} connections={blueprint.placedConduits[ConduitType.WIRE]} />
	<Layers
		overlayType={OVERLAY.PLUMBING}
		connections={blueprint.placedConduits[ConduitType.LIQUID]}
	/>
	<Layers
		overlayType={OVERLAY.VENTILATION}
		connections={blueprint.placedConduits[ConduitType.GAS]}
	/>
	<Layers
		overlayType={OVERLAY.AUTOMATION}
		connections={blueprint.placedConduits[ConduitType.LOGIC_WIRE]}
	/>
	<Layers
		overlayType={OVERLAY.SHIPPING}
		connections={blueprint.placedConduits[ConduitType.CONVEYOR]}
	/>
	{#if message.popup && !blueprint.isValidPlacement}
		<MousePopup content={message.popup} {mousePosition} />
	{/if}
	{#if showSelectPopup && selectModeHoverResult}
		<MousePopup {mousePosition}>
			{#snippet children()}
				<div class="min-w-28">
					{#if appConfig.devMode && selectModeGridPosition}
						<div class="border-b border-b-dark-active pb-1 text-xs">
							Grid ({selectModeGridPosition.x}, {selectModeGridPosition.y})
						</div>
					{/if}
					{#each selectModeHoverResult?.buildings ?? [] as building}
						<div class="px-0.5 text-sm">{building.display_name}</div>
					{/each}
					{#each selectModeHoverResult?.conduits ?? [] as conduit}
						<div class="px-0.5 text-sm">{conduit.displayName}</div>
					{/each}
					{#if selectModeHoverResult?.tile}
						<div class="px-0.5 text-sm">
							{selectModeHoverResult.tile.displayName || selectModeHoverResult.tile.name || 'Tile'}
						</div>
					{/if}
					{#if selectModeHoverResult?.element}
						<div class="px-0.5 text-sm">
							{selectModeHoverResult.element.name} ({selectModeHoverResult.element.type}) - {selectModeHoverResult.element.temperature}°C - {selectModeHoverResult.element.mass} kg
						</div>
					{/if}
				</div>
			{/snippet}
		</MousePopup>
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
