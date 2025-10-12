<script lang="ts">
	import Buildings from 'src/components/Buildings.svelte';
	import Category from 'src/components/ui/Category.svelte';
	import Tools from 'src/components/ui/Tools.svelte';
	import Overlays from 'src/components/ui/Overlays.svelte';
	import { globalState } from '$lib/universal/globalState.svelte';
	import { innerHeight, innerWidth } from 'svelte/reactivity/window';
	import type { PageProps } from './$types';

	$effect(() => {
		globalState.initWindowWidth = Number(innerWidth);
		globalState.initWindowHeight = Number(innerHeight);
	});
</script>

<main>
	<!-- <h1>Construction - Oxygen not Included</h1> -->
	<h1>Mode: Build</h1>

	<!-- <Category /> -->
	<Overlays />
	<!-- <Tools /> -->

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
