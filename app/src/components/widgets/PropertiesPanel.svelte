<!-- Properties panel for element painting — element selector dropdown + mass/temperature inputs -->
<script lang="ts">
	import { blueprint } from '$lib/state/blueprint.svelte';
	import { appConfig } from '$lib/state/config.svelte';
	import { ACTION } from '$lib/constant';
	import { listElements } from '$lib/api/elements.api';
	import { debounce } from '$lib/utils/helpers';
	import { rgbaToCss } from '$lib/utils/color';
	import type { IElement } from 'src/interface/element';
	import GasIcon from 'src/components/icons/GasIcon.svelte';
	import LiquidIcon from 'src/components/icons/LiquidIcon.svelte';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import * as Popover from '$lib/ui/primitives/popover/index.js';

	const BASE_IMG_PATH = import.meta.env.VITE_API_URL;

	const elementTypes = [
		{ id: 'solid', name: 'Solid' },
		{ id: 'liquid', name: 'Liquid' },
		{ id: 'gas', name: 'Gas' },
		{ id: 'vacuum', name: 'Vacuum' }
	];

	const showPanel = $derived(appConfig.selectedAction === ACTION.PAINT);

	let dropdownOpen = $state(false);
	let activeType = $state('');
	let elements = $state<IElement[]>([]);
	let textSearch = $state('');

	async function onSelectType(typeId: string) {
		if (typeId === activeType) {
			activeType = '';
			elements = [];
			return;
		}
		activeType = typeId;
		textSearch = '';
		elements = await listElements({ type: typeId });
	}

	async function onSearchElement() {
		elements = textSearch
			? await listElements({ search: textSearch })
			: activeType
				? await listElements({ type: activeType })
				: [];
	}

	function onSelectElement(element: IElement) {
		if (!blueprint.pixiApp || !blueprint.camera || !blueprint.buildContainer) {
			console.error('Global app state not initialized');
			return;
		}

		appConfig.selectedElement = element;
		appConfig.selectedAction = ACTION.PAINT;
		dropdownOpen = false;
	}

	function clearSelection(e: MouseEvent) {
		e.stopPropagation();
		appConfig.selectedElement = null;
	}

	// Reset dropdown state when leaving paint mode
	$effect(() => {
		if (appConfig.selectedAction !== ACTION.PAINT) {
			dropdownOpen = false;
			activeType = '';
			elements = [];
		}
	});
</script>

{#if showPanel}
	<div class="flex w-72 flex-col gap-3 rounded-md border border-orange-primary bg-dark-primary p-4">
		<h2 class="text-sm font-semibold text-white">Element Properties</h2>

		<!-- Element selector popover -->
		<div class="flex flex-col gap-1">
			<Popover.Root bind:open={dropdownOpen}>
				<Popover.Trigger
					class="flex cursor-pointer items-center justify-between rounded-md border border-dark-active bg-dark-secondary px-3 py-2 text-sm text-white transition-colors hover:bg-dark-active"
				>
					{#if appConfig.selectedElement}
						<span class="flex items-center gap-2">
							<span
								class="inline-block h-4 w-4 rounded-sm border border-dark-active"
								style="background-color: {rgbaToCss(appConfig.selectedElement.uiColour)}"
							></span>
							<span>{appConfig.selectedElement.name}</span>
						</span>
						<span class="flex items-center gap-1">
							<span
								role="button"
								tabindex="0"
								onclick={clearSelection}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ')
										clearSelection(e as unknown as MouseEvent);
								}}
								class="rounded p-0.5 text-gray-primary hover:text-white"
							>
								<X size={14} />
							</span>
							<ChevronDown
								size={16}
								class="text-gray-primary transition-transform {dropdownOpen ? 'rotate-180' : ''}"
							/>
						</span>
					{:else}
						<span class="text-gray-primary">Choose element</span>
						<ChevronDown
							size={16}
							class="text-gray-primary transition-transform {dropdownOpen ? 'rotate-180' : ''}"
						/>
					{/if}
				</Popover.Trigger>

				<Popover.Content
					align="start"
					sideOffset={6}
					class="flex w-72 flex-col gap-2 border-dark-active bg-dark-secondary p-2"
				>
					<!-- Element type filter buttons -->
					<div class="flex gap-1">
						{#each elementTypes as type}
							<button
								onclick={() => onSelectType(type.id)}
								class="flex-1 rounded-md px-2 py-1.5 text-xs text-white transition-colors {activeType ===
								type.id
									? 'bg-orange-primary hover:bg-orange-6'
									: 'bg-dark-primary hover:bg-dark-active'}"
							>
								{type.name}
							</button>
						{/each}
					</div>

					<!-- Search input -->
					{#if activeType}
						<input
							bind:value={textSearch}
							oninput={debounce(onSearchElement, 300)}
							type="text"
							placeholder="Search elements..."
							class="w-full rounded-md bg-dark-primary px-3 py-1.5 text-sm text-white placeholder-gray-primary outline-none focus:ring-1 focus:ring-orange-primary"
						/>
					{/if}

					<!-- Element grid -->
					{#if elements.length > 0}
						<div class="grid max-h-[40vh] grid-cols-4 gap-1 overflow-y-auto pr-1">
							{#each elements as element}
								<button
									onclick={() => onSelectElement(element)}
									class="flex min-h-[72px] flex-col items-center justify-center rounded-md bg-dark-primary p-1 transition-colors hover:bg-dark-active {appConfig
										.selectedElement?.id === element.id
										? 'ring-1 ring-orange-primary'
										: ''}"
								>
									{#if element.type === 'gas'}
										<GasIcon color={rgbaToCss(element.uiColour)} size={32} />
									{:else if element.type === 'liquid'}
										<LiquidIcon color={rgbaToCss(element.uiColour)} size={32} />
									{:else}
										<img
											src={BASE_IMG_PATH + '/element_images/' + element.texture + '.png'}
											alt={element.name}
											class="h-8 shrink-0"
										/>
									{/if}
									<p
										class="mt-1 w-full text-center text-[10px] leading-tight break-words text-white"
									>
										{element.name}
									</p>
								</button>
							{/each}
						</div>
					{:else if activeType}
						<p class="py-2 text-center text-xs text-gray-primary">Select a type above</p>
					{/if}
				</Popover.Content>
			</Popover.Root>
		</div>

		<!-- Mass & Temperature inputs (show when element is selected) -->
		{#if appConfig.selectedElement}
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between gap-2">
					<label class="text-xs text-gray-primary" for="mass">Mass (kg)</label>
					<input
						name="mass"
						type="number"
						bind:value={appConfig.paintMass}
						min={0}
						class="w-16 rounded-md bg-dark-secondary py-1 text-center text-sm text-white outline-none"
					/>
				</div>

				<div class="flex items-center justify-between gap-2">
					<label class=" text-xs text-gray-primary" for="temperature">Temperature (°C)</label>
					<input
						name="temperature"
						type="number"
						bind:value={appConfig.paintTemperature}
						class="w-16 rounded-md bg-dark-secondary py-1 text-center text-sm text-white outline-none"
					/>
				</div>
			</div>
		{/if}
	</div>
{/if}
