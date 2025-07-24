<script lang="ts">
    import * as PIXI from 'pixi.js';
    import {
        globalState,
        mousePosition,
        placedBuildings,
        gridPosition,
        message,
    } from '$lib/universal/globalState.svelte';
    import Plumbing from 'src/components/layers/Plumbing.svelte';
    import { Camera } from 'src/utils/camera';
    import { Renderer } from 'src/utils/renderer';
    import { Controller } from 'src/utils/controller';
    import { MOUSE_CLICK } from 'src/lib/constant';
    import { drawBuilding } from 'src/lib/core/drawBuilding';
    import { dragDrawBuilding } from 'src/lib/core/connectBuilding';
    import { previewBuilding } from 'src/lib/core/previewBuilding';
    import { calculateBuildingOffset } from 'src/lib/core/positionBuilding';
    import { createPlacementSprite, cleanupPlacement } from 'src/utils/pixi';
    import type { PlacementState } from 'src/interface/building';
    import MousePopup from 'src/components/common/MousePopup.svelte';
    import { worldToGrid } from 'src/lib/helpers/gridTransform';
    import { getConnectionListType } from 'src/utils/helper';

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
            backgroundColor: '#2c2c2c',
        });

        globalState.pixiApp = app;

        const mainContainer = new PIXI.Container({ label: 'Main' });
        const buildContainer = new PIXI.Container({ label: 'Building grid' });

        app.stage.addChild(mainContainer);
        mainContainer.addChild(buildContainer);

        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;

        // Setup camera and grid systems
        const camera = new Camera(buildContainer);
        const gridRenderer = new Renderer(
            buildContainer,
            camera,
            app.screen.width,
            app.screen.height,
        );
        const controller = new Controller();

        // Store camera and buildContainer in global stores
        globalState.camera = camera;
        globalState.buildContainer = buildContainer;

        gridRenderer.draw();

        app.ticker.add(() => {
            const moveSpeed = 5;
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
            gridPosition.x = gridX;
            gridPosition.y = gridY;

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
    }

    $effect(() => {
        if (!canvasElement) return;

        const app = new PIXI.Application();
        //@ts-ignore
        globalThis.__PIXI_APP__ = app;

        initPixiApp(app).catch(console.error);

        return () => {
            isPanning = false;

            if (globalState.pixiApp) {
                globalState.pixiApp.destroy(true, { children: true, texture: true });
                globalState.pixiApp = null;
                console.log('Pixi cleared');
            }
        };
    });

    // Handle building placement and preview
    $effect(() => {
        const app = globalState.pixiApp;
        const camera = globalState.camera;
        const selectedBuilding = globalState.selectedBuilding;
        const container = globalState.buildContainer;
        if (!selectedBuilding || !app || !camera || !container) {
            if (currentPlacement && app && container) {
                cleanupPlacement(currentPlacement, container, app);
                currentPlacement = null;
            }
            return;
        }

        // Clean up previous placement state if exists
        if (currentPlacement) {
            cleanupPlacement(currentPlacement, container, app);
        }

        const sprite = createPlacementSprite(selectedBuilding, container, {
            zIndex: 999,
        });

        const offset = calculateBuildingOffset(selectedBuilding);

        const previewState = previewBuilding(sprite, selectedBuilding, camera, offset);

        const placementState = drawBuilding(sprite, selectedBuilding, container, camera, {
            onCancel: () => {
                globalState.selectedBuilding = null;
            },
        });

        // Attach handlers
        if (previewState.mouseMoveHandler) {
            app.stage.on('pointermove', previewState.mouseMoveHandler);
        }
        if (placementState.clickHandler) {
            if (selectedBuilding.is_drag_build || selectedBuilding.special_texture.length > 0)
                return;

            app.stage.on('pointerdown', placementState.clickHandler);
        }

        currentPlacement = {
            sprite: sprite,
            mouseMoveHandler: previewState.mouseMoveHandler,
            clickHandler: placementState.clickHandler,
        };

        return () => {
            if (currentPlacement && app && container) {
                cleanupPlacement(currentPlacement, container, app);
                currentPlacement = null;
            }
        };
    });

    // Handle special building with "is_drag_build" is true and "special_texture" is not empty array
    $effect(() => {
        const app = globalState.pixiApp;
        const camera = globalState.camera;
        const selectedBuilding = globalState.selectedBuilding;

        if (
            !selectedBuilding ||
            !selectedBuilding.is_drag_build ||
            selectedBuilding.special_texture.length === 0 ||
            !app ||
            !camera
        ) {
            return;
        }

        // TODO: Determine which connection list to use based on building type
        let connectionList = getConnectionListType();

        // Get drag handlers
        const dragHandlers = dragDrawBuilding(camera, connectionList, selectedBuilding, {
            onConnect: (from, to) => {
                // TODO: Update textures after connection
                // This will be implemented after updateConnectionTextures is available
            },
        });

        const handlePointerDown = (event: PIXI.FederatedPointerEvent) => {
            dragHandlers.startDrag(event);
        };

        const handlePointerMove = (event: PIXI.FederatedPointerEvent) => {
            dragHandlers.moveDrag(event);
        };

        const handlePointerUp = (event: PIXI.FederatedPointerEvent) => {
            dragHandlers.endDrag(event);
        };

        const handlePointerLeave = () => {
            dragHandlers.cancelDrag();
        };

        // Attach handlers
        app.stage.on('pointerdown', handlePointerDown);
        app.stage.on('pointermove', handlePointerMove);
        app.stage.on('pointerup', handlePointerUp);
        app.stage.on('pointerleave', handlePointerLeave);

        return () => {
            app.stage?.removeEventListener('pointerdown', handlePointerDown);
            app.stage?.removeEventListener('pointermove', handlePointerMove);
            app.stage?.removeEventListener('pointerup', handlePointerUp);
            app.stage?.removeEventListener('pointerleave', handlePointerLeave);
            dragHandlers.cancelDrag();
        };
    });
</script>

<div class="grid-wrapper">
    {#if !canvasElement}
        <p>Loading Canvas...</p>
    {/if}
    <canvas bind:this={canvasElement}></canvas>
    <Plumbing />
    {#if message.popup && !globalState.isValidPlacement}
        <MousePopup content={`Collide with building ${message.popup}`} {mousePosition} />
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
