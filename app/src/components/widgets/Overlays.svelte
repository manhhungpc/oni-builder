<!-- Overlays panel - based on Oxygen Not Included UI -->
<script lang="ts">
	import { appConfig } from '$lib/state/config.svelte';
	import { OVERLAY } from '$lib/constant';
	import type { DropdownItem } from 'src/interface';
	import { ChevronDown } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/ui/primitives/dropdown-menu';

	const overlays: DropdownItem[] = [
		{
			value: OVERLAY.BUILDING,
			text: 'Buildings',
			icon: 'overlay_storageregion.png',
			hotkey: 'Esc'
		},
		{ value: OVERLAY.OXYGEN, text: 'Oxygen', icon: 'overlay_oxygen.png', hotkey: 'F1' },
		{ value: OVERLAY.POWER, text: 'Power', icon: 'overlay_power.png', hotkey: 'F2' },
		{
			value: OVERLAY.PLUMBING,
			text: 'Liquid Pipes',
			icon: 'overlay_liquidvent.png',
			hotkey: 'F6'
		},
		{
			value: OVERLAY.VENTILATION,
			text: 'Gas Pipes',
			icon: 'overlay_gasvent.png',
			hotkey: 'F7'
		},
		{ value: OVERLAY.AUTOMATION, text: 'Automation', icon: 'overlay_logic.png', hotkey: null },
		{ value: OVERLAY.SHIPPING, text: 'Conveyor', icon: 'overlay_conveyor.png', hotkey: null }
	];

	let open = $state(false);
	let overlayData = $derived(overlays.find((item) => item.value === appConfig.selectedOverlay));

	function selectOverlay(value: number) {
		appConfig.selectedOverlay = value;
		open = false;
	}

	// // Keyboard shortcuts
	// $effect(() => {
	//     function handleKeyDown(e: KeyboardEvent) {
	//         // Handle Escape key to clear overlay
	//         if (e.key === "Escape") {
	//             e.preventDefault();
	//             selectOverlay("");
	//             return;
	//         }

	//         const overlay = overlays.find((o) => {
	//             if (o.hotkey.includes("Ctrl+")) {
	//                 const key = o.hotkey.replace("Ctrl+", "");
	//                 return e.ctrlKey && e.key === key;
	//             }
	//             return e.key === o.hotkey;
	//         });

	//         if (overlay) {
	//             e.preventDefault();
	//             selectOverlay(overlay.id);
	//         }
	//     }

	//     window.addEventListener("keydown", handleKeyDown);
	//     return () => window.removeEventListener("keydown", handleKeyDown);
	// });
</script>

<div id="overlay-dropdown" class="bg-dark-primary fixed right-2 top-2 z-50 rounded-md p-2">
	<div class="flex h-10 items-center gap-3 rounded-lg p-3">
		<p class="font-medium text-white">OVERLAYS</p>
		<div class="border-dark-active h-8 border"></div>
		<DropdownMenu.Root bind:open>
			<DropdownMenu.Trigger
				class="hover:bg-dark-secondary flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
			>
				<img
					src={`/src/assets/overlays/${overlayData?.icon}`}
					alt="selected_overlay"
					class="h-5 w-5"
				/>
				<p>{overlayData?.text}</p>
				<div class={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}>
					<ChevronDown />
				</div>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="bg-dark-primary border-dark-active w-56 border"
				sideOffset={20}
				align="end"
			>
				<DropdownMenu.RadioGroup value={appConfig.selectedOverlay.toString()}>
					{#each overlays as overlay}
						<DropdownMenu.RadioItem
							value={overlay.value.toString()}
							onclick={() => selectOverlay(overlay.value)}
							class="hover:text-dark-primary hover:bg-yellow-primary flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-white transition-colors hover:font-medium"
						>
							<img
								src={`/src/assets/overlays/${overlay.icon}`}
								alt={overlay.text}
								class="h-5 w-5"
							/>
							<span class="flex-1">{overlay.text}</span>
							{#if overlay.hotkey}
								<DropdownMenu.Shortcut>{overlay.hotkey}</DropdownMenu.Shortcut>
							{/if}
						</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</div>

<style>
</style>
