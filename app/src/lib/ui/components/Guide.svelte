<script lang="ts">
	import * as Kbd from '$lib/ui/primitives/kbd/index';
</script>

<div class="mt-8">
	<h1 class="text-xl font-bold">Guide</h1>
	<h2 class="text-orange-4 font-medium">1. Controls</h2>
	<div class="mb-2 grid grid-cols-5 text-sm">
		<div class="border-gray-primary col-span-2 flex items-center border-b p-2">
			<span class="text-white">Move and pan</span>
		</div>
		<div class="border-gray-primary col-span-3 border-b p-2">
			<p class="text-xs">
				<b>Right Mouse Button</b> or
				<Kbd.Group>
					<Kbd.Root>W</Kbd.Root>
					<Kbd.Root>A</Kbd.Root>
					<Kbd.Root>S</Kbd.Root>
					<Kbd.Root>D</Kbd.Root>
				</Kbd.Group>
			</p>
		</div>
		<div class="col-span-2 p-2">
			<span class="text-white">Zoom in/out</span>
		</div>
		<div class="col-span-3 p-2">
			<p class="text-xs"><b>Scroll Wheel</b></p>
		</div>
	</div>
	<h2 class="text-orange-4 font-medium">2. Interface</h2>
	<div class="text-sm">
		<p>- Top-left is Building selection</p>
		<p>- Top right is Overlay selection</p>
		<p>- Below Overlay is Tools to interact with blueprint</p>
	</div>
</div>
