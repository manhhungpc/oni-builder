<script lang="ts">
	import Buildings from 'src/components/Buildings.svelte';
	import BuildCategory from 'src/components/widgets/BuildCategory.svelte';
	import ElementSelector from 'src/components/widgets/ElementSelector.svelte';
	import Tools from 'src/components/widgets/Tools.svelte';
	import Overlays from 'src/components/widgets/Overlays.svelte';

	import { appConfig } from '$lib/state/config.svelte';
	import { browser } from '$app/environment';

	let hasOpenedGuide = $state(browser && localStorage.getItem('has-open-first-guide') === 'true');

	function onOpenFirstGuide() {
		appConfig.sidebarOpen = true;
		localStorage.setItem('has-open-first-guide', 'true');
		hasOpenedGuide = true;
	}
</script>

<main>
	<BuildCategory />
	<ElementSelector />
	<Overlays />
	<Tools />

	<Buildings />
	{#if !hasOpenedGuide}
		<button
			class="absolute bottom-3 right-5 z-10 flex animate-bounce cursor-pointer flex-col items-center gap-1"
			onclick={onOpenFirstGuide}
		>
			<div class="bg-orange-6 rounded-lg p-2 text-center text-sm">
				Welcome! New here? <br />
				View the guide <b><u>HERE</u></b> to get started
			</div>
			<img src="/images/ONI_Ellie_Icon.png" alt="ellie-icon" class="w-20 shrink-0" />
		</button>
	{/if}
</main>

<style>
	main {
		width: 100%;
		height: 100%;
		position: relative;
	}
</style>
