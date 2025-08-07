<!-- An sidebar for helper tools, like select, build mode, ... -->
<script lang="ts">
    import { Slider } from '$lib/ui/common/slider';
    import { Switch } from '$lib/ui/common/switch';
    import { Button } from '$lib/ui/common/button';
    import { appConfig, globalState } from '$lib/universal/globalState.svelte';

    function onActionClick(action: ACTION) {
        globalState.currentAction = action;
        if (action == ACTION.CUT) {
            globalState.selectedBuilding = null;
        }
    }

    import { ACTION } from 'src/lib/constant';
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

        <div class="flex justify-between gap-2">
            <Button
                class="bg-red-500 hover:cursor-pointer"
                onclick={() => onActionClick(ACTION.CUT)}>Cut connection</Button
            >
            <Button
                class="bg-red-500 hover:cursor-pointer"
                onclick={() => onActionClick(ACTION.DELETE)}>Delete building</Button
            >
        </div>

        <Button class="bg-red-500 hover:cursor-pointer">Get shared url</Button>
    </div>
</div>
