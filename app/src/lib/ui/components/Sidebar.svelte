<script lang="ts">
	import * as Drawer from '$lib/ui/primitives/drawer/index.js';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		trigger: any;
		header?: any;
		content: any;
		footer?: any;
	}

	let { trigger, header, content, footer }: Props = $props();
</script>

<Drawer.Root direction="right">
	<Drawer.Trigger>
		{@render trigger()}
	</Drawer.Trigger>
	<Drawer.Content>
		<Drawer.Header class=" flex flex-row items-center justify-between ">
			{@render header?.()}
			<Drawer.Close class="ml-auto"><X /></Drawer.Close>
		</Drawer.Header>
		<div class="border-dark-active mx-4 h-full border-b text-white">
			{@render content()}
		</div>
		<Drawer.Footer>
			{@render footer?.()}
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>

<style>
</style>
