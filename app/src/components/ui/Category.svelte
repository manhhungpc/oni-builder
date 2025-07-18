<!-- Category for buildings - https://oxygennotincluded.wiki.gg/wiki/Building -->
<script lang="ts">
    import { globalState, placedBuildings } from '$lib/universal/globalState.svelte';
    import type { IBuilding } from '@shared/src/interface';
    import { loadSprites, cleanupPlacement as cleanupPlacementUtil } from 'src/utils/pixi';
    import type { PlacementState } from 'src/interface/building';
    import { listBuilding } from 'src/api/building';
    import { debounce } from 'src/utils/helper';

    const BASE_IMG_PATH = import.meta.env.VITE_IMAGE_BASE_PATH;
    const categories = [
        { id: 'base', name: 'Base', icon: 'icon_category_base.png' },
        { id: 'oxygen', name: 'Oxygen', icon: 'icon_category_oxygen.png' },
        { id: 'power', name: 'Power', icon: 'icon_category_electrical.png' },
        { id: 'food', name: 'Food', icon: 'icon_category_food.png' },
        { id: 'plumbing', name: 'Plumbing', icon: 'icon_category_plumbing.png' },
        { id: 'hvac', name: 'Ventilation', icon: 'icon_category_ventilation.png' },
        { id: 'refining', name: 'Refinement', icon: 'icon_category_refinery.png' },
        { id: 'medical', name: 'Medicine', icon: 'icon_category_medical.png' },
        { id: 'furniture', name: 'Furniture', icon: 'icon_category_furniture.png' },
        { id: 'equipment', name: 'Stations', icon: 'icon_category_misc.png' },
        { id: 'utilities', name: 'Utilities', icon: 'icon_category_utilities.png' },
        { id: 'automation', name: 'Automation', icon: 'icon_category_automation.png' },
        { id: 'conveyance', name: 'Shipping', icon: 'icon_category_shipping.png' },
        { id: 'rocketry', name: 'Rocketry', icon: 'icon_category_rocketry.png' },
        // { id: 'hep', name: 'Radiation', icon: 'icon_category_radiation.png' },
    ];

    let activeCategory = $state('');
    let openBuildingsModal = $state(false);
    let buildings = $state<IBuilding[]>([]);
    let textSearch = $state('');
    let placementState = $state<PlacementState>({
        sprite: null,
        mouseMoveHandler: null,
        clickHandler: null,
    });

    async function onSelectCategory(categoryId: string) {
        if (categoryId == activeCategory) {
            openBuildingsModal = false;
            activeCategory = '';
        } else {
            openBuildingsModal = true;
            activeCategory = categoryId;
        }
        buildings = await listBuilding({ category: categoryId });
        await loadSprites(buildings, BASE_IMG_PATH);
    }

    async function onSearchBuilding() {
        buildings = textSearch
            ? await listBuilding({ search: textSearch })
            : await listBuilding({ category: activeCategory });
    }

    function cleanupPreview() {
        cleanupPlacementUtil(placementState, globalState.buildContainer, globalState.pixiApp);
    }

    function onSelectToBuild(building: IBuilding) {
        if (!globalState.pixiApp || !globalState.camera || !globalState.buildContainer) {
            console.error('Global app state not initialized');
            return;
        }

        globalState.selectedBuilding = building;
    }

    $effect(() => {
        return () => {
            cleanupPreview();
        };
    });

    $inspect(placedBuildings);
</script>

<div class="fixed z-50 left-2 top-2 p-2 bg-dark-primary rounded-lg">
    <div class="flex gap-2">
        {#each categories as category}
            <button
                onclick={() => onSelectCategory(category.id)}
                class="category-button {activeCategory === category.id ? 'active' : ''}"
                title={category.name}
            >
                <img src="/src/assets/miniui/{category.icon}" alt={category.name} class="w-8 h-8" />
            </button>
        {/each}
    </div>
</div>
{#if openBuildingsModal}
    <!-- Invisible overlay to detect clicks outside -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    {#if !globalState.selectedBuilding}
        <div
            class="fixed h-full w-full inset-0 z-40"
            onclick={() => {
                openBuildingsModal = false;
                activeCategory = '';
            }}
        ></div>
    {/if}

    <!-- Modal content -->
    <div class="fixed z-50 left-2 top-[72px] p-2 bg-dark-primary rounded-lg">
        <input
            bind:value={textSearch}
            oninput={debounce(onSearchBuilding, 300)}
            id="input-search-building"
            type="text"
            placeholder="Search buildings..."
            class="w-full mb-1 px-3 py-1.5 bg-dark-secondary rounded text-sm text-white placeholder-gray-400"
        />
        <div class="grid grid-cols-4 gap-1 h-full max-h-[50vh] overflow-y-scroll pr-2">
            {#each buildings as building}
                <button
                    onclick={() => onSelectToBuild(building)}
                    class="flex flex-col w-20 h-24 justify-center items-center p-1 bg-dark-primary hover:!bg-neutral-700 rounded"
                >
                    <div class="h-14 w-14">
                        <img
                            src={building.display_image}
                            alt={building.display_name}
                            class="w-full h-full object-contain"
                        />
                    </div>
                    <p class="text-sm leading-none">{building.display_name}</p>
                </button>
            {/each}
        </div>
    </div>
{/if}

<style>
    .category-button {
        padding: 4px;
        background: #2a2a2a;
        border: 1px solid #3a3a3a;
        border-radius: 6px;
        transition: all 0.1s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .category-button:hover {
        background: #3a3a3a;
        border-color: #4a4a4a;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .category-button:active {
        transform: translateY(0);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    .category-button:focus {
        outline: none;
    }

    .category-button.active {
        background: #ffd735;
        box-shadow:
            0 0 12px rgba(231, 76, 60, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    .category-button.active:hover {
        background: #ffd735;
        border-color: #ffd735;
    }
</style>
