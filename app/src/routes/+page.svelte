<script lang="ts">
	import Buildings from 'src/components/Buildings.svelte';
	import BuildCategory from 'src/components/widgets/BuildCategory.svelte';
	import Tools from 'src/components/widgets/Tools.svelte';
	import Overlays from 'src/components/widgets/Overlays.svelte';
	import { page } from '$app/state';
</script>

<main>
	<h1>Mode: Build</h1>

	<BuildCategory />
	<Overlays />
	<Tools />

	<Buildings />
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
