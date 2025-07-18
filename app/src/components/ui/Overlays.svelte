<!-- Overlays panel - based on Oxygen Not Included UI -->
<script lang="ts">
    import { globalState } from '$lib/universal/globalState.svelte';
    import { OVERLAY } from '@shared/src/enum';
    import Dropdown from 'src/components/common/Dropdown.svelte';
    import type { DropdownItem } from 'src/interface';
    import { ChevronDown } from '@lucide/svelte';

    const overlays: DropdownItem[] = [
        { value: 0, text: 'Buildings', icon: 'overlay_storageregion.png', hotkey: 'Esc' },
        { value: 5, text: 'Oxygen', icon: 'overlay_oxygen.png', hotkey: 'F1' },
        { value: 1, text: 'Power', icon: 'overlay_power.png', hotkey: 'F2' },
        { value: 2, text: 'Liquid Pipes', icon: 'overlay_liquidvent.png', hotkey: 'F6' },
        { value: 3, text: 'Gas Pipes', icon: 'overlay_gasvent.png', hotkey: 'F7' },
        { value: 4, text: 'Automation', icon: 'overlay_logic.png', hotkey: null },
        { value: 6, text: 'Conveyor', icon: 'overlay_conveyor.png', hotkey: null },
    ];

    let open = $state(false);
    let selectedOverlays = $state(OVERLAY.BUILDING);

    let dropdownOverlays = $derived(overlays.map((item) => ({ ...item, iconPath: '/src/assets/overlays/' })));

    $effect(() => {
        globalState.currentOverlays = overlays.find((item) => item.value == selectedOverlays) as any;
    });

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

<div id="overlay-dropdown" class="fixed z-50 top-2 right-2 bg-dark-primary p-2 rounded-md">
    <div class="flex items-center gap-3 p-3 rounded-lg h-10">
        <p class="text-white font-medium">OVERLAYS</p>
        <div class="h-8 border border-dark-active"></div>
        <Dropdown items={dropdownOverlays} bind:open bind:value={selectedOverlays}>
            {#snippet trigger()}
                <div class="flex items-center justify-center gap-2">
                    <img
                        src={`/src/assets/overlays/${globalState.currentOverlays.icon}`}
                        alt="selected_overlay"
                        class="w-5 h-5"
                    />
                    <p>{globalState.currentOverlays.text}</p>
                    <div class={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}>
                        <ChevronDown />
                    </div>
                </div>
            {/snippet}
        </Dropdown>
    </div>
</div>

<style>
</style>
