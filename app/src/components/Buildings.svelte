<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { blueprint } from '$lib/state/blueprint.svelte';
	import { appConfig, mousePosition, message } from '$lib/state/config.svelte';
	import Layers from 'src/components/Layers.svelte';
	import { ConduitType } from '$lib/state/blueprint.svelte';
	import { OVERLAY } from '$lib/constant';
	import { Controller } from '$lib/core/controller';
	import { ACTION, MOUSE_CLICK } from '$lib/constant';
	import { drawBuilding } from '$lib/core/drawBuilding';
	import { dragDrawConduit, updateConduitTexture } from '$lib/core/connectConduit';
	import { previewBuilding } from '$lib/core/preview';
	import { calculateBuildingOffset } from '$lib/core/positioning';
	import { createPlacementSprite, cleanupAttachSprite } from '$lib/rendering/pixi';
	import type { ConduitNode, PlacementState } from 'src/interface/building';
	import MousePopup from '$lib/ui/components/MousePopup.svelte';
	import { worldToGrid } from '$lib/utils/grid/transform';
	import { getConduitList } from '$lib/utils/helpers';
	import type { IBuilding } from 'src/interface/building';
	import type { PlacedBuildings } from 'src/interface';
	import { loadSavedBuildings, loadSavedConduits } from '$lib/blueprint-data/loader';
	import { checkBuildingBoundary, createDeleteHighlight } from 'src/lib/utils';

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

	async function initPixiApp(app: PIXI.Application) {
		if (!app || !canvasElement) return;

		// Initialize PIXI app through centralized state management
		await blueprint.initPixiApp(app, canvasElement);

		const camera = blueprint.camera;
		const gridRenderer = blueprint.gridRenderer;
		const buildContainer = blueprint.buildContainer;

		if (!camera || !gridRenderer || !buildContainer) return;

		const controller = new Controller();

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

	// Handle building placement and preview
	$effect(() => {
		const app = blueprint.pixiApp;
		const selectedToBuild = appConfig.selectedToBuild;
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

		const previewState = previewBuilding(sprite, selectedToBuild, offset);

		const placementState = drawBuilding(sprite, selectedToBuild, {
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
					if (currentPlacement && app) {
						cleanupAttachSprite(currentPlacement, app);
						currentPlacement = null;
					}
				};

			app.stage.on('pointerdown', placementState.clickHandler);
		}

		return () => {
			if (currentPlacement && app) {
				cleanupAttachSprite(currentPlacement, app);
				currentPlacement = null;
			}
		};
	});

	// Handle special building with "is_drag_build" is true and "special_texture" is not empty array
	let selectedBuilding: IBuilding | Partial<IBuilding> | null = $state(null);
	$effect(() => {
		const app = blueprint.pixiApp;
		selectedBuilding = appConfig.selectedToBuild;

		if (!app) {
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
