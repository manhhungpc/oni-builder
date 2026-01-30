<!-- Element selector for painting elements on the grid -->
<script lang="ts">
	import { blueprint } from '$lib/state/blueprint.svelte';
	import type { IElement } from 'src/interface/element';
	import { listElements } from '$lib/api/elements.api';
	import { debounce } from '$lib/utils/helpers';
	import { ACTION } from '$lib/constant';
	import { appConfig } from 'src/lib/state/config.svelte';

	const elementTypes = [
		{ id: 'solid', name: 'Solid' },
		{ id: 'liquid', name: 'Liquid' },
		{ id: 'gas', name: 'Gas' },
		{ id: 'vacuum', name: 'Vacuum' }
	];

	let activeType = $state('');
	let openElementsModal = $state(false);
	let elements = $state<IElement[]>([]);
	let textSearch = $state('');

	// Only show when in PAINT mode
	const showSelector = $derived(appConfig.selectedAction === ACTION.PAINT);

	async function onSelectType(typeId: string) {
		if (typeId === activeType) {
			openElementsModal = false;
			activeType = '';
		} else {
			openElementsModal = true;
			activeType = typeId;
		}
		elements = await listElements({ type: typeId });
	}

	async function onSearchElement() {
		elements = textSearch
			? await listElements({ search: textSearch })
			: await listElements({ type: activeType });
	}

	function onSelectToPaint(element: IElement) {
		if (!blueprint.pixiApp || !blueprint.camera || !blueprint.buildContainer) {
			console.error('Global app state not initialized');
			return;
		}

		appConfig.selectedElement = element;
		appConfig.selectedAction = ACTION.PAINT;
	}

	/**
	 * Parse element colour string "r,g,b,a" to CSS rgb
	 */
	function getElementColorStyle(colorString: string | null): string {
		if (!colorString) return 'rgb(128, 128, 128)';

		const parts = colorString.split(',').map(Number);
		if (parts.length < 3) return 'rgb(128, 128, 128)';

		const [r, g, b] = parts;
		return `rgb(${r}, ${g}, ${b})`;
	}

	$effect(() => {
		const handleCloseElementModal = () => {
			openElementsModal = false;
			activeType = '';
		};

		window.addEventListener('close-element-modal', handleCloseElementModal);

		return () => {
			window.removeEventListener('close-element-modal', handleCloseElementModal);
		};
	});
</script>

{#if showSelector}
	<div class="bg-dark-primary fixed left-2 top-16 z-50 rounded-lg p-2">
		<div class="flex gap-2">
			{#each elementTypes as type}
				<button
					onclick={() => onSelectType(type.id)}
					class="type-button {activeType === type.id ? 'active' : ''}"
					title={type.name}
				>
					<span class="text-sm">{type.name}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if openElementsModal}
		<!-- Invisible overlay to detect clicks outside -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		{#if !appConfig.selectedElement}
			<div
				class="fixed inset-0 z-40 h-full w-full"
				onclick={() => {
					openElementsModal = false;
					activeType = '';
				}}
			></div>
		{/if}

		<!-- Modal content -->
		<div class="bg-dark-primary fixed left-2 top-[120px] z-50 rounded-lg p-2">
			<input
				bind:value={textSearch}
				oninput={debounce(onSearchElement, 300)}
				id="input-search-element"
				type="text"
				placeholder="Search elements..."
				class="bg-dark-secondary mb-1 w-full rounded px-3 py-1.5 text-sm text-white placeholder-gray-400"
			/>
			<div class="grid h-full max-h-[50vh] grid-cols-4 gap-1 overflow-y-scroll pr-2">
				{#each elements as element}
					<button
						onclick={() => onSelectToPaint(element)}
						class="bg-dark-primary flex h-20 w-20 flex-col items-center justify-center rounded p-1 hover:!bg-neutral-700"
					>
						<div
							class="h-10 w-10 rounded"
							style="background-color: {getElementColorStyle(element.colour)}"
						></div>
						<p class="mt-1 truncate text-xs leading-none">{element.name}</p>
					</button>
				{/each}
			</div>
		</div>
	{/if}
{/if}

<style>
	.type-button {
		padding: 6px 12px;
		background: #2a2a2a;
		border: 1px solid #3a3a3a;
		border-radius: 6px;
		transition: all 0.1s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.type-button:hover {
		background: #3a3a3a;
		border-color: #4a4a4a;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.type-button:active {
		transform: translateY(0);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
	}

	.type-button:focus {
		outline: none;
	}

	.type-button.active {
		background: #ff6b6b;
		border-color: #ff6b6b;
		box-shadow:
			0 0 12px rgba(255, 107, 107, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}

	.type-button.active:hover {
		background: #ff5252;
		border-color: #ff5252;
	}
</style>
