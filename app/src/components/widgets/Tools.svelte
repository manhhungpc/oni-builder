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
	import Menu from '@lucide/svelte/icons/menu';
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
	import Sidebar from 'src/lib/ui/components/Sidebar.svelte';
	import { loginWithGoogle, logout } from 'src/lib/api/users.api';
	import { page } from '$app/state';
	import type { Component } from 'svelte';
	import GoogleLogo from '$lib/assets/google-logo.svg';
	import Hammer from '@lucide/svelte/icons/hammer';
	import Users from '@lucide/svelte/icons/users';
	import { goto } from '$app/navigation';
	import Guide from 'src/lib/ui/components/Guide.svelte';

	interface Props {
		shareable?: boolean;
	}

	const sidebar = [
		{
			text: page.data.user ? 'My collection' : 'Login with Google',
			class: page.data.user && 'bg-orange-primary hover:bg-orange-6',
			icon: page.data.user ? Hammer : GoogleLogo,
			action: () => loginWithGoogle()
		},
		{
			text: 'Browse others build',
			icon: Users,
			action: () => goto('/blueprints')
		}
	];

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

		if (blueprint.camera && blueprint.gridRenderer) {
			appConfig.zoomLevel = updatedZoomLevel;
			blueprint.camera.zoomAt(mouseX, mouseY, scale);
			blueprint.gridRenderer.draw();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="bg-dark-primary border-orange-primary fixed right-2 top-20 z-20 min-w-64 rounded-md border p-4"
	onclick={() => {
		// Dispatch custom event to close building modal
		window.dispatchEvent(new CustomEvent('close-building-modal'));
	}}
>
	<div class="flex flex-col gap-5">
		<div class="flex justify-between">
			<div class="text-xl">Mode: <b>{appConfig.selectedAction}</b></div>
			{@render tool_sidebar()}
		</div>
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

		<!-- <div class="flex items-center justify-between">
			<p>Enable foundation check</p>
			<Switch disabled class="disabled:!cursor-not-allowed" />
		</div>

		<div class="flex items-center justify-between">
			<p>Show liquid/gas flow</p>
			<Switch disabled class="disabled:!cursor-not-allowed" />
		</div> -->

		<div class="flex gap-2">
			{@render button_with_tooltip(
				ACTION.SELECT,
				MousePointer2,
				'Select building / View properties'
			)}
			<!-- {@render button_with_tooltip(ACTION.FILL, PaintBucket, 'Fill element')} -->
			{@render button_with_tooltip(ACTION.CUT, ScissorsLineDashed, 'Cut pipes connection')}
			{@render button_with_tooltip(ACTION.DELETE, OctagonMinus, 'Delete building')}
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
				<div class="flex w-56 flex-row items-center gap-1">
					<p class="select-text truncate text-xs text-blue-400">
						{shareUrl}
					</p>
					<Button size="icon" onclick={() => navigator.clipboard.writeText(shareUrl)}>
						<Copy />
					</Button>
				</div>
			</div>
		{/if}

		{#if shareable}
			<Button
				class="bg-orange-primary hover:bg-orange-6 hover:cursor-pointer disabled:opacity-50"
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

{#snippet button_with_tooltip(action: ACTION, IconComponent: Component, tooltipText: string)}
	<Tooltip.Provider delayDuration={0}>
		<Tooltip.Root>
			<Tooltip.Trigger
				size="icon"
				class={getActionButtonClass(action)}
				onclick={() => onActionClick(action)}
			>
				<IconComponent />
			</Tooltip.Trigger>
			<Tooltip.Content class="bg-white text-black" arrowClasses="bg-white">
				<p>{tooltipText}</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/snippet}

{#snippet tool_sidebar()}
	<Sidebar>
		{#snippet trigger()}
			<Button size="icon" class="border-orange-6 h-8 w-8 border bg-transparent text-white">
				<Menu />
			</Button>
		{/snippet}

		{#snippet header()}
			<h1 class=" text-xl">Ellie Sticker Bomber</h1>
		{/snippet}

		{#snippet content()}
			{#if page.data.user}
				<div class="flex items-start justify-between gap-3">
					<div class="mb-4 flex flex-col justify-center">
						<span class="text-gray-primary text-xs">Welcome,</span>
						<span class="text-lg font-bold text-white">{page.data.user.name}</span>
					</div>
					<img src={page.data.user.avatar} alt="avatar" class="h-10 w-10 rounded-full" />
				</div>
			{/if}
			{#each sidebar as item}
				<Button
					class={cn(
						'bg-dark-secondary hover:bg-dark-active mb-2 flex w-full items-center justify-center',
						item.class
					)}
					onclick={item.action}
				>
					{#if typeof item.icon === 'string'}
						<img src={item.icon} alt="icon" class="h-4 w-4" />
					{:else if item.icon}
						<item.icon />
					{/if}
					<p>{item.text}</p>
				</Button>
			{/each}
			<Guide />
		{/snippet}

		{#snippet footer()}
			<Button
				class="bg-dark-secondary hover:bg-dark-active mb-2 flex w-full items-center justify-center"
				onclick={() => logout()}
			>
				Log out
			</Button>
		{/snippet}
	</Sidebar>
{/snippet}
