<!-- An sidebar for helper tools, like select, build mode, ... -->
<script lang="ts">
    import { Slider } from '$lib/ui/common/slider';
    import { Switch } from '$lib/ui/common/switch';
    import { Button } from '$lib/ui/common/button';
    import { appConfig, globalState } from '$lib/universal/globalState.svelte';
    import { SimpleTooltip } from '$lib/ui/common/tooltip/index.js';
    import ScissorsLineDashed from '@lucide/svelte/icons/scissors-line-dashed';
    import OctagonMinus from '@lucide/svelte/icons/octagon-minus';
    import MousePointer2 from '@lucide/svelte/icons/mouse-pointer-2';
    import MessageCircleWarning from '@lucide/svelte/icons/message-circle-warning';
    import { ACTION } from 'src/lib/constant';
    import { OVERLAY } from 'src/lib/constant';
    import { cn } from 'src/lib/utils';

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
                : 'bg-dark-secondary hover:bg-dark-active text-white'
        );
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

        <Button class="bg-red-500 hover:bg-dark-active hover:cursor-pointer">Get shared url</Button>
    </div>
</div>
