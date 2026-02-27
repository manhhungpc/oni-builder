<script lang="ts">
	import { Button } from '$lib/ui/primitives/button';
	import { pipeFlowState } from '$lib/state/flowSimulation.svelte';
	import type { IElement } from 'src/interface/element';
	import { listElements } from '$lib/api/elements.api';
	import { debounce } from '$lib/utils/helpers';
	import LiquidIcon from 'src/components/icons/LiquidIcon.svelte';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import { rgbaToCss } from '$lib/utils/color';

	let showElementPicker = $state(false);
	let elements = $state<IElement[]>([]);
	let textSearch = $state('');
	let isLoadingElements = $state(false);

	// Computed states
	const canStart = $derived(
		pipeFlowState.selectedElement !== null && pipeFlowState.filledPipes.size > 0
	);
	const isRunning = $derived(pipeFlowState.isRunning);
	const selectedElement = $derived(pipeFlowState.selectedElement);
	const fillMode = $derived(pipeFlowState.fillMode);

	async function loadLiquidElements() {
		isLoadingElements = true;
		elements = await listElements({ type: 'liquid' });
		isLoadingElements = false;
	}

	async function onSearchElement() {
		isLoadingElements = true;
		elements = textSearch
			? await listElements({ search: textSearch, type: 'liquid' })
			: await listElements({ type: 'liquid' });
		isLoadingElements = false;
	}

	function selectElement(element: IElement) {
		pipeFlowState.selectedElement = element;
		showElementPicker = false;
	}

	function toggleElementPicker() {
		showElementPicker = !showElementPicker;
		if (showElementPicker && elements.length === 0) {
			loadLiquidElements();
		}
	}

	function handleStart() {
		pipeFlowState.startSimulation();
	}

	function handleStop() {
		pipeFlowState.stopSimulation();
	}

	function handleReset() {
		pipeFlowState.resetSimulation();
	}

	function toggleFillMode() {
		pipeFlowState.fillMode = fillMode === 'auto' ? 'manual' : 'auto';
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="fixed right-0 bottom-0 left-0 z-20 bg-dark-primary px-4 py-3">
	<div class="flex items-center gap-4">
		<!-- Label -->
		<div class="flex items-center gap-2">
			<span class="text-sm font-bold text-orange-primary">Simulation</span>
		</div>

		<!-- Divider -->
		<div class="h-6 w-px bg-gray-600"></div>

		<!-- Element Selector -->
		<div class="relative">
			<button
				onclick={toggleElementPicker}
				class="flex items-center gap-2 rounded bg-dark-secondary px-3 py-1.5 text-sm hover:bg-dark-active"
			>
				{#if selectedElement}
					<LiquidIcon color={rgbaToCss(selectedElement.uiColour)} />
					<span>{selectedElement.name}</span>
				{:else}
					<span class="text-gray-400">Select liquid...</span>
				{/if}
				<ChevronUp class="h-3 w-3 text-gray-400" />
			</button>

			<!-- Element Picker Dropdown (opens upward) -->
			{#if showElementPicker}
				<div
					class="absolute bottom-full left-0 mb-1 max-h-48 w-56 overflow-y-auto rounded border border-gray-700 bg-dark-secondary"
				>
					<input
						bind:value={textSearch}
						oninput={debounce(onSearchElement, 300)}
						type="text"
						placeholder="Search..."
						class="sticky top-0 w-full border-b border-gray-700 bg-dark-primary px-3 py-2 text-sm text-white placeholder-gray-500"
					/>
					{#if isLoadingElements}
						<div class="p-3 text-center text-gray-400">Loading...</div>
					{:else}
						{#each elements as element}
							<button
								onclick={() => selectElement(element)}
								class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-dark-active"
							>
								<LiquidIcon color={rgbaToCss(element.uiColour)} />
								<span>{element.name}</span>
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Divider -->
		<div class="h-6 w-px bg-gray-600"></div>

		<!-- Fill Mode Toggle -->
		<div class="flex items-center gap-2">
			<span class="text-xs text-gray-400">Fill:</span>
			<button
				onclick={toggleFillMode}
				class="rounded px-2 py-1 text-xs font-medium {fillMode === 'auto'
					? 'bg-orange-primary text-white'
					: 'bg-dark-secondary text-gray-300 hover:bg-dark-active'}"
			>
				{fillMode === 'auto' ? 'Auto' : 'Manual'}
			</button>
		</div>

		<!-- Divider -->
		<div class="h-6 w-px bg-gray-600"></div>

		<!-- Speed Label -->
		<div class="flex items-center gap-1">
			<span class="text-xs text-gray-400">Speed:</span>
			<span class="text-xs font-medium text-white">1x</span>
		</div>

		<!-- Divider -->
		<div class="h-6 w-px bg-gray-600"></div>

		<!-- Control Buttons -->
		<div class="flex gap-2">
			{#if isRunning}
				<Button
					onclick={handleStop}
					class="bg-yellow-primary px-3 py-1.5 text-sm text-dark-primary hover:bg-yellow-6"
				>
					<Pause class="mr-1 h-3 w-3" />
					Stop
				</Button>
			{:else}
				<Button
					onclick={handleStart}
					disabled={!canStart}
					class="bg-orange-primary px-3 py-1.5 text-sm hover:bg-orange-6 disabled:opacity-50"
				>
					<Play class="mr-1 h-3 w-3" />
					Start
				</Button>
			{/if}
			<Button
				onclick={handleReset}
				class="bg-dark-secondary px-2 py-1.5 hover:bg-dark-active"
				title="Reset simulation"
			>
				<RotateCcw class="h-3 w-3" />
			</Button>
		</div>

		<!-- Help Text (right-aligned) -->
		<div class="ml-auto text-xs text-gray-500">Click pipes to fill, then Start</div>
	</div>
</div>
