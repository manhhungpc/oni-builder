<!-- Overlays panel - based on Oxygen Not Included UI -->
<script lang="ts">
    import { globalState } from '$lib/universal/globalState.svelte';
    import { OVERLAY } from 'src/lib/constant';
    import type { DropdownItem } from 'src/interface';
    import { ChevronDown } from '@lucide/svelte';
    import * as DropdownMenu from '$lib/ui/common/dropdown-menu';

    const overlays: DropdownItem[] = [
        {
            value: OVERLAY.BUILDING,
            text: 'Buildings',
            icon: 'overlay_storageregion.png',
            hotkey: 'Esc',
        },
        { value: OVERLAY.OXYGEN, text: 'Oxygen', icon: 'overlay_oxygen.png', hotkey: 'F1' },
        { value: OVERLAY.POWER, text: 'Power', icon: 'overlay_power.png', hotkey: 'F2' },
        {
            value: OVERLAY.PLUMBING,
            text: 'Liquid Pipes',
            icon: 'overlay_liquidvent.png',
            hotkey: 'F6',
        },
        {
            value: OVERLAY.VENTILATION,
            text: 'Gas Pipes',
            icon: 'overlay_gasvent.png',
            hotkey: 'F7',
        },
        { value: OVERLAY.AUTOMATION, text: 'Automation', icon: 'overlay_logic.png', hotkey: null },
        { value: OVERLAY.SHIPPING, text: 'Conveyor', icon: 'overlay_conveyor.png', hotkey: null },
    ];

    let open = $state(false);
    let overlayData = $derived(overlays.find((item) => item.value === globalState.currentOverlays));

    function selectOverlay(value: number) {
        globalState.currentOverlays = value;
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

<div id="overlay-dropdown" class="fixed z-50 top-2 right-2 bg-dark-primary p-2 rounded-md">
    <div class="flex items-center gap-3 p-3 rounded-lg h-10">
        <p class="text-white font-medium">OVERLAYS</p>
        <div class="h-8 border border-dark-active"></div>
        <DropdownMenu.Root bind:open>
            <DropdownMenu.Trigger
                class="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-dark-secondary transition-colors"
            >
                <img
                    src={`/src/assets/overlays/${overlayData?.icon}`}
                    alt="selected_overlay"
                    class="w-5 h-5"
                />
                <p>{overlayData?.text}</p>
                <div
                    class={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
                >
                    <ChevronDown />
                </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
                class="w-56 bg-dark-primary border border-dark-active"
                sideOffset={20}
                align="end"
            >
                <DropdownMenu.RadioGroup value={globalState.currentOverlays.toString()}>
                    {#each overlays as overlay}
                        <DropdownMenu.RadioItem
                            value={overlay.value.toString()}
                            onclick={() => selectOverlay(overlay.value)}
                            class="flex items-center gap-3 px-3 py-2 text-sm text-white hover:font-medium hover:text-dark-primary hover:bg-yellow-primary transition-colors cursor-pointer"
                        >
                            <img
                                src={`/src/assets/overlays/${overlay.icon}`}
                                alt={overlay.text}
                                class="w-5 h-5"
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
