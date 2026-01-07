<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/ONI_Ellie_Icon.png';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { migrateGuestBlueprints } from '$lib/api/blueprints.api';
	import { getLocalGuest } from 'src/lib/utils/helpers';

	let { children } = $props();

	onMount(async () => {
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
	<link rel="icon" href={favicon} />
	<title>Ellie Sticker Bomber</title>
</svelte:head>

{@render children?.()}
