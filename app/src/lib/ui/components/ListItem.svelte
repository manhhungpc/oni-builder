<script lang="ts">
	import Pencil from '@lucide/svelte/icons/pencil';
	import Eye from '@lucide/svelte/icons/eye';
	import Check from '@lucide/svelte/icons/check';

	interface Props {
		name: string;
		date: string;
		href: string;
		onSave?: (newName: string) => void;
	}

	let { name, date, href, onSave }: Props = $props();

	let isEditing = $state(false);
	let editedName = $state(name);

	function startEditing() {
		editedName = name;
		isEditing = true;
	}

	function saveEdit() {
		if (editedName.trim() && editedName !== name) {
			onSave?.(editedName.trim());
		}
		isEditing = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			saveEdit();
		} else if (event.key === 'Escape') {
			isEditing = false;
		}
	}
</script>

<div
	class="border-dark-secondary hover:bg-dark-secondary flex items-center justify-between border p-2"
>
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-1">
			{#if isEditing}
				<input
					type="text"
					bind:value={editedName}
					onkeydown={handleKeydown}
					class="border-dark-active w-1/2 rounded border px-1 font-medium text-white outline-none"
				/>
				<button class="text-orange-4 ml-1 shrink-0 hover:cursor-pointer" onclick={saveEdit}>
					<Check class="h-3 w-3" />
				</button>
			{:else}
				<p class="truncate font-medium text-white">{name}</p>
				<button
					class="text-gray-primary hover:text-orange-4 ml-1 shrink-0 hover:cursor-pointer"
					onclick={startEditing}
				>
					<Pencil class="h-3 w-3" />
				</button>
			{/if}
		</div>
		<p class="text-gray-primary text-xs">
			{new Date(date).toLocaleDateString()}
		</p>
	</div>
	<a
		{href}
		target="_blank"
		class="bg-dark-active hover:bg-orange-primary ml-2 shrink-0 rounded px-2 py-1 text-xs text-white"
	>
		<Eye class="h-4 w-4" />
	</a>
</div>
