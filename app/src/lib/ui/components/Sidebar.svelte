<script lang="ts">
	import * as Drawer from '$lib/ui/primitives/drawer/index.js';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		trigger: any;
		header?: any;
		content: any;
	}

	let { trigger, header, content }: Props = $props();
</script>

<Drawer.Root direction="right" class="border-0">
	<Drawer.Trigger>
		{@render trigger()}
	</Drawer.Trigger>
	<Drawer.Content>
		<Drawer.Header class="bg-dark-primary flex flex-row items-center justify-between">
			{@render header?.()}
			<Drawer.Close class="ml-auto"><X /></Drawer.Close>
		</Drawer.Header>
		<div class="bg-dark-primary h-full p-4 text-white">
			{@render content()}
		</div>
	</Drawer.Content>
</Drawer.Root>

<style>
</style>
