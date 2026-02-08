<script lang="ts">
	import '../app.css';

	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { migrateGuestBlueprints } from '$lib/api/blueprints.api';
	import { getLocalGuest } from 'src/lib/utils/helpers';
	import { setDevMode } from '$lib/state/config.svelte';

	let { children } = $props();

	onMount(async () => {
		setDevMode();
		const user = $page.data.user;
		const guestId = getLocalGuest();

		if (user && guestId) {
			try {
				await migrateGuestBlueprints(guestId);
				localStorage.removeItem('guest-id');
			} catch (e) {
				console.error('Migration failed:', e);
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href="/images/ONI_Ellie_Icon.png" />
	<title>Ellie Sticker Bomber</title>
</svelte:head>

{@render children?.()}
