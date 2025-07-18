<script lang="ts">
    import Buildings from 'src/components/Buildings.svelte';
    import MousePopup from 'src/components/common/MousePopup.svelte';
    import Category from 'src/components/ui/Category.svelte';
    import HelperTools from 'src/components/ui/HelperTools.svelte';
    import Overlays from 'src/components/ui/Overlays.svelte';
    import { globalState } from '$lib/universal/globalState.svelte';

    let { innerWidth, innerHeight } = $state(window);

    $effect(() => {
        globalState.initWindowWidth = innerWidth;
        globalState.initWindowHeight = innerHeight;
    });
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<main>
    <!-- <h1>Construction - Oxygen not Included</h1> -->
    <h1>Mode: Build</h1>

    <Category />
    <Overlays />
    <HelperTools />

    <Buildings />
    <!-- <MousePopup content="Hello" /> -->
</main>

<style>
    main {
        width: 100%;
        height: 100%;
    }
    h1 {
        color: white;
        text-align: center;
        margin-bottom: 1rem;
        position: fixed;
        top: 0;
        width: 100%;
        pointer-events: none;
    }
</style>
