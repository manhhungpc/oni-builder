<!-- An sidebar for helper tools, like select, build mode, ... -->
<script lang="ts">
	import { Slider } from '$lib/ui/primitives/slider';
	import { Switch } from '$lib/ui/primitives/switch';
	import { Button } from '$lib/ui/primitives/button';
	import * as Tooltip from '$lib/ui/primitives/tooltip/index.js';
	import { blueprint } from '$lib/state/blueprint.svelte';
	import { appConfig } from '$lib/state/config.svelte';
	import ScissorsLineDashed from '@lucide/svelte/icons/scissors-line-dashed';
	import OctagonMinus from '@lucide/svelte/icons/octagon-minus';
	import MousePointer2 from '@lucide/svelte/icons/mouse-pointer-2';
	import MessageCircleWarning from '@lucide/svelte/icons/message-circle-warning';
	import Copy from '@lucide/svelte/icons/copy';
	import PaintBucket from '@lucide/svelte/icons/paint-bucket';
	import { ACTION } from '$lib/constant';
	import { OVERLAY } from '$lib/constant';
	import { cn } from '$lib/utils';
	import {
		compressBuildingData,
		compressBuildingConnectionData
	} from '$lib/compression/compressData';
	import { ConduitType } from '$lib/state/blueprint.svelte';
	import { createSharedBlueprint } from '$lib/api/blueprints.api';
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';

	interface Props {
		shareable?: boolean;
	}

	let isSharing = $state(false);
	let shareError = $state('');
	let shareUrl = $state('');

	let { shareable = true }: Props = $props();

	async function handleShareUrl() {
		try {
			isSharing = true;
			shareError = '';

			// Check if there are any buildings to share
			if (blueprint.placedBuildings.length === 0) {
				shareError = 'Hey, draw something first!';
				return;
			}

			// Compress the buildings data
			const compressedBuildings = compressBuildingData(blueprint.placedBuildings);

			// Compress all connection types (will compress to empty array if map is empty)
			const compressedConnections = {
				liquidPipes: compressBuildingConnectionData(blueprint.placedConduits[ConduitType.LIQUID]),
				gasPipes: compressBuildingConnectionData(blueprint.placedConduits[ConduitType.GAS]),
				wires: compressBuildingConnectionData(blueprint.placedConduits[ConduitType.WIRE]),
				logicWires: compressBuildingConnectionData(
					blueprint.placedConduits[ConduitType.LOGIC_WIRE]
				),
				tiles: compressBuildingConnectionData(blueprint.placedConduits[ConduitType.TILES]),
				conveyor: compressBuildingConnectionData(blueprint.placedConduits[ConduitType.CONVEYOR])
			};

			// Create blueprint via API
			const response = await createSharedBlueprint({
				name: 'Shared Blueprint',
				buildings: compressedBuildings,
				connections: compressedConnections
			});

			if (response.success && response.data.shareId) {
				// Construct and set the share URL
				shareUrl = `${window.location.origin}/blueprints/${response.data.shareId}`;
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

	function onActionClick(action: ACTION) {
		appConfig.selectedAction = action;
		if (action == ACTION.CUT) {
			appConfig.selectedOverlay = OVERLAY.PLUMBING;
			appConfig.selectedToBuild = null;
		}
	}

	function getActionButtonClass(action: ACTION) {
		const isActive = appConfig.selectedAction === action;
		return cn(
			'hover:cursor-pointer h-9 px-4 py-2 rounded-md',
			isActive
				? 'bg-orange-primary hover:bg-orange-primary text-white'
				: 'bg-dark-secondary hover:bg-dark-active text-white'
		);
	}

	function changeZoomLevel(scale: number) {
		const mouseX = window.innerWidth / 2;
		const mouseY = window.innerHeight / 2;

		const updatedZoomLevel = appConfig.zoomLevel + scale * 100;
		if (updatedZoomLevel <= 0 || updatedZoomLevel > 200) return;

		if (blueprint.camera && blueprint.renderer) {
			appConfig.zoomLevel = updatedZoomLevel;
			blueprint.camera.zoomAt(mouseX, mouseY, scale);
			blueprint.renderer.draw();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="bg-dark-primary fixed right-2 top-20 z-20 min-w-64 rounded-md border border-red-500 p-4"
	onclick={() => {
		// Dispatch custom event to close building modal
		window.dispatchEvent(new CustomEvent('close-building-modal'));
	}}
>
	<div class="flex flex-col gap-5">
		<div class="text-xl">Mode: <b>{appConfig.selectedAction}</b></div>
		<div>
			<span class="mb-2 flex justify-between">
				<p>Pan speed:</p>
				<p>{appConfig.panSpeed}</p>
			</span>
			<Slider type="single" bind:value={appConfig.panSpeed} min={1} max={20} step={1} />
		</div>
		<div class="flex items-center justify-between">
			<p>Zoom level:</p>
			<span class="flex items-center gap-1">
				<Button
					size="icon"
					class=" h-8 w-8 bg-transparent text-white"
					onclick={() => changeZoomLevel(-0.1)}
				>
					<ZoomOut />
				</Button>
				<p>{appConfig.zoomLevel}%</p>
				<Button
					size="icon"
					class=" h-8 w-8 bg-transparent text-white"
					onclick={() => changeZoomLevel(+0.1)}
				>
					<ZoomIn />
				</Button>
			</span>
		</div>

		<div class="flex items-center justify-between">
			<p>Enable foundation check</p>
			<Switch disabled class="disabled:!cursor-not-allowed" />
		</div>

		<div class="flex items-center justify-between">
			<p>Show liquid/gas flow</p>
			<Switch disabled class="disabled:!cursor-not-allowed" />
		</div>

		<div class="flex gap-2">
			<Tooltip.Provider delayDuration={0}>
				<Tooltip.Root>
					<Tooltip.Trigger
						size="icon"
						class={getActionButtonClass(ACTION.SELECT)}
						onclick={() => onActionClick(ACTION.SELECT)}
					>
						<MousePointer2 />
					</Tooltip.Trigger>
					<Tooltip.Content class="bg-white text-black" arrowClasses="bg-white">
						<p>Select building / View properties</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
			<Tooltip.Provider delayDuration={0}>
				<Tooltip.Root>
					<Tooltip.Trigger
						size="icon"
						class={getActionButtonClass(ACTION.FILL)}
						onclick={() => onActionClick(ACTION.FILL)}
					>
						<PaintBucket />
					</Tooltip.Trigger>
					<Tooltip.Content class="bg-white text-black" arrowClasses="bg-white">
						<p>Fill element</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
			<Tooltip.Provider delayDuration={0}>
				<Tooltip.Root>
					<Tooltip.Trigger
						size="icon"
						class={getActionButtonClass(ACTION.CUT)}
						onclick={() => onActionClick(ACTION.CUT)}
					>
						<ScissorsLineDashed />
					</Tooltip.Trigger>
					<Tooltip.Content class="bg-white text-black" arrowClasses="bg-white">
						<p>Cut connection</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
			<Tooltip.Provider delayDuration={0}>
				<Tooltip.Root>
					<Tooltip.Trigger
						size="icon"
						class={getActionButtonClass(ACTION.DELETE)}
						onclick={() => onActionClick(ACTION.DELETE)}
					>
						<OctagonMinus />
					</Tooltip.Trigger>
					<Tooltip.Content class="bg-white text-black" arrowClasses="bg-white">
						<p>Delete building</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
		{#if appConfig.selectedAction == ACTION.CUT}
			<small class="text-yellow-4 flex items-center gap-2">
				<MessageCircleWarning />
				Choose overlay before proceed
			</small>
		{/if}

		{#if shareUrl}
			<div class="bg-dark-secondary flex flex-col gap-2 rounded p-2">
				<small class="text-gray-400">Share URL:</small>
				<p class="cursor-pointer select-text break-all text-xs text-blue-400">
					{shareUrl}
				</p>
				<Button size="icon" onclick={() => navigator.clipboard.writeText(shareUrl)}>
					<Copy />
				</Button>
			</div>
		{/if}

		{#if shareable}
			<Button
				class="hover:bg-dark-active bg-red-500 hover:cursor-pointer disabled:opacity-50"
				onclick={handleShareUrl}
				disabled={isSharing}
			>
				{isSharing ? 'Creating share link...' : 'Get shared url'}
			</Button>
		{/if}
		{#if shareError}
			<small class="text-red-500">{shareError}</small>
		{/if}
	</div>
</div>
