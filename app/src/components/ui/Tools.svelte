<!-- An sidebar for helper tools, like select, build mode, ... -->
<script lang="ts">
    import { Slider } from '$lib/ui/common/slider';
    import { Switch } from '$lib/ui/common/switch';
    import { Button } from '$lib/ui/common/button';
    import { appConfig, globalState, placedBuildings } from '$lib/universal/globalState.svelte';
    import { SimpleTooltip } from '$lib/ui/common/tooltip/index.js';
    import ScissorsLineDashed from '@lucide/svelte/icons/scissors-line-dashed';
    import OctagonMinus from '@lucide/svelte/icons/octagon-minus';
    import MousePointer2 from '@lucide/svelte/icons/mouse-pointer-2';
    import MessageCircleWarning from '@lucide/svelte/icons/message-circle-warning';
    import { ACTION } from 'src/lib/constant';
    import { OVERLAY } from 'src/lib/constant';
    import { cn } from 'src/lib/utils';
    import {
        compressBuildingData,
        compressBuildingConnectionData,
        decompressBuildingData,
        decompressBuildingConnectionData,
    } from '$lib/core/compressData';
    import { createSharedBlueprint } from 'src/api/blueprint';
    import {
        liquidPipesConnection,
        gasPipesConnection,
        wiresConnection,
        logicWiresConnection,
        tilesConnection,
        conveyorConnection,
        otherConnection,
    } from '$lib/universal/connections.svelte';

    function onActionClick(action: ACTION) {
        globalState.currentAction = action;
        if (action == ACTION.CUT) {
            globalState.currentOverlays = OVERLAY.PLUMBING;
            globalState.selectedBuilding = null;
        }
    }

    function getActionButtonClass(action: ACTION) {
        const isActive = globalState.currentAction === action;
        return cn(
            'hover:cursor-pointer',
            isActive
                ? 'bg-orange-primary hover:bg-orange-primary text-white'
                : 'bg-dark-secondary hover:bg-dark-active text-white',
        );
    }

    let isSharing = false;
    let shareError = '';
    let shareUrl = '';
    let lastCompressedData: { buildings: any; connections: any } | null = null;

    async function handleShareUrl() {
        try {
            isSharing = true;
            shareError = '';

            // Check if there are any buildings to share
            if (placedBuildings.length === 0) {
                shareError = 'Hey, draw something first!';
                return;
            }

            // Compress the buildings data
            const compressedBuildings = compressBuildingData(placedBuildings);

            // Compress all connection types (will compress to empty array if map is empty)
            const compressedConnections = {
                liquidPipes: compressBuildingConnectionData(liquidPipesConnection),
                gasPipes: compressBuildingConnectionData(gasPipesConnection),
                wires: compressBuildingConnectionData(wiresConnection),
                logicWires: compressBuildingConnectionData(logicWiresConnection),
                tiles: compressBuildingConnectionData(tilesConnection),
                conveyor: compressBuildingConnectionData(conveyorConnection),
                other: compressBuildingConnectionData(otherConnection),
            };

            // Store the compressed data for testing
            lastCompressedData = {
                buildings: compressedBuildings,
                connections: compressedConnections,
            };

            // Create blueprint via API
            const response = await createSharedBlueprint({
                name: 'Shared Blueprint',
                buildings: compressedBuildings,
                connections: compressedConnections,
            });

            if (response.success && response.data.shareId) {
                // Construct and set the share URL
                shareUrl = `${window.location.origin}/share/${response.data.shareId}`;

                // Copy the share URL to clipboard
                await navigator.clipboard.writeText(shareUrl);
            } else {
                shareError = 'Failed to create share URL';
            }
        } catch (error) {
            console.error('Error sharing blueprint:', error);
            shareError = error instanceof Error ? error.message : 'Failed to share';
        } finally {
            isSharing = false;
        }
    }

    // TODO: Remove when move to sveltekit
    function handleTestDecompression() {
        if (!lastCompressedData) {
            console.warn('No compressed data available. Click "Get shared url" first.');
            return;
        }

        // Decompress buildings
        const decompressedBuildings = decompressBuildingData({
            buildings: lastCompressedData.buildings,
            timestamp: Date.now(),
        });

        console.log('Decompressed buildings:', decompressedBuildings);

        // Decompress connections
        if (lastCompressedData.connections) {
            const decompressedConnections = {
                liquidPipes: decompressBuildingConnectionData(lastCompressedData.connections.liquidPipes),
                gasPipes: decompressBuildingConnectionData(lastCompressedData.connections.gasPipes),
                wires: decompressBuildingConnectionData(lastCompressedData.connections.wires),
                logicWires: decompressBuildingConnectionData(lastCompressedData.connections.logicWires),
                tiles: decompressBuildingConnectionData(lastCompressedData.connections.tiles),
                conveyor: decompressBuildingConnectionData(lastCompressedData.connections.conveyor),
                other: decompressBuildingConnectionData(lastCompressedData.connections.other),
            };

            console.log('Decompressed connections:', decompressedConnections);
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    class="fixed z-20 top-20 right-2 border border-red-500 bg-dark-primary p-4 rounded-md min-w-64"
    onclick={() => {
        // Dispatch custom event to close building modal
        window.dispatchEvent(new CustomEvent('close-building-modal'));
    }}
>
    <div class="flex flex-col gap-5">
        <div class="text-xl">Mode: <b>{globalState.currentAction}</b></div>
        <div>
            <span class="flex justify-between mb-2">
                <p>Pan speed:</p>
                <p>{appConfig.panSpeed}</p>
            </span>
            <Slider type="single" bind:value={appConfig.panSpeed} min={1} max={20} step={1} />
        </div>

        <div class="flex justify-between items-center">
            <p>Enable foundation check</p>
            <Switch disabled class="disabled:!cursor-not-allowed" />
        </div>

        <div class="flex justify-between items-center">
            <p>Show liquid/gas flow</p>
            <Switch disabled class="disabled:!cursor-not-allowed" />
        </div>

        <div class="flex gap-2">
            <SimpleTooltip arrowClasses="bg-white" contentClass="bg-white text-black">
                {#snippet trigger()}
                    <Button
                        class={getActionButtonClass(ACTION.SELECT)}
                        onclick={() => onActionClick(ACTION.SELECT)}
                    >
                        <MousePointer2 />
                    </Button>
                {/snippet}
                {#snippet content()}
                    Select building / View properties
                {/snippet}
            </SimpleTooltip>
            <SimpleTooltip arrowClasses="bg-white" contentClass="bg-white text-black">
                {#snippet trigger()}
                    <Button
                        class={getActionButtonClass(ACTION.CUT)}
                        onclick={() => onActionClick(ACTION.CUT)}
                    >
                        <ScissorsLineDashed />
                    </Button>
                {/snippet}
                {#snippet content()}
                    Cut connection
                {/snippet}
            </SimpleTooltip>
            <SimpleTooltip arrowClasses="bg-white" contentClass="bg-white text-black">
                {#snippet trigger()}
                    <Button
                        class={getActionButtonClass(ACTION.DELETE)}
                        onclick={() => onActionClick(ACTION.DELETE)}
                    >
                        <OctagonMinus />
                    </Button>
                {/snippet}
                {#snippet content()}
                    Delete building
                {/snippet}
            </SimpleTooltip>
        </div>
        {#if globalState.currentAction == ACTION.CUT}
            <small class="text-yellow-4 flex items-center gap-2">
                <MessageCircleWarning />
                Choose overlay before proceed
            </small>
        {/if}

        {#if shareUrl}
            <div class="flex flex-col gap-2 p-2 bg-dark-secondary rounded">
                <small class="text-gray-400">Share URL:</small>
                <p class="text-xs text-blue-400 break-all select-text cursor-pointer">
                    {shareUrl}
                </p>
                <small class="text-gray-500">Click to copy</small>
            </div>
        {/if}

        <Button
            class="bg-red-500 hover:bg-dark-active hover:cursor-pointer disabled:opacity-50"
            onclick={handleShareUrl}
            disabled={isSharing}
        >
            {isSharing ? 'Creating share link...' : 'Get shared url'}
        </Button>
        {#if shareError}
            <small class="text-red-500">{shareError}</small>
        {/if}
    </div>
</div>
