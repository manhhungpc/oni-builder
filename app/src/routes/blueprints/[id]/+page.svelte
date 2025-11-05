<script lang="ts">
	import Buildings from 'src/components/Buildings.svelte';
	import Tools from 'src/components/widgets/Tools.svelte';
	import Overlays from 'src/components/widgets/Overlays.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main>
	<!-- <h1>Construction - Oxygen not Included</h1> -->
	<h1>Mode: Build</h1>

	<!-- <Category /> -->
	<Overlays />
	<Tools shareable={false} />

	<Buildings savedBuildings={data.buildings} savedConnections={data.connections} />
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
