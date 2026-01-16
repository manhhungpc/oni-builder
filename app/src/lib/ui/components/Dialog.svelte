<script lang="ts">
	import * as Dialog from '$lib/ui/primitives/dialog/index.js';

	interface Props {
		open?: boolean;
		trigger: any;
		title?: any;
		content: any;
		footer?: any;
	}
	let { trigger, title, content, footer, open = $bindable(false) }: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class="flex items-center">
		{@render trigger()}
	</Dialog.Trigger>
	<Dialog.Content class="bg-primary app-dialog border-0">
		<Dialog.Header>
			<Dialog.Title>{@render title?.()}</Dialog.Title>
		</Dialog.Header>
		{@render content?.()}
		<Dialog.Footer class="sm:justify-start">
			{@render footer?.()}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.app-dialog [data-dialog-close]) {
		outline: none;
		border: 0;
		box-shadow: none;
	}
</style>
