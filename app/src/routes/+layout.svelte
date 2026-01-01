<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/ONI_Ellie_Icon.png';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Ellie Sticker Bomber</title>
</svelte:head>

{@render children?.()}
