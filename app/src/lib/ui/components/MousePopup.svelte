<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		visible?: boolean;
		content?: string;
		className?: string;
		mousePosition?: { x: number; y: number } | null;
		children?: any;
	}

	let {
		visible = true,
		content = '',
		className = '',
		mousePosition = null,
		children
	}: Props = $props();

	let mouseX = $state(0);
	let mouseY = $state(0);
	let popupElement: HTMLDivElement | null = $state(null);
	let mounted = $state(false);

	function handleMouseMove(event: MouseEvent) {
		mouseX = event.clientX;
		mouseY = event.clientY;
	}

	// Calculate popup position with boundary checking
	const popupPosition = $derived(() => {
		if (!mounted || !popupElement) return { x: null, y: null };

		const rect = popupElement.getBoundingClientRect();
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		const currentMouseX = mousePosition?.x ?? mouseX;
		const currentMouseY = mousePosition?.y ?? mouseY;

		// Position popup below and slightly right of cursor
		let x = currentMouseX + 20;
		let y = currentMouseY + 20;

		// If popup goes off right edge, show on left side of cursor
		if (x + rect.width > windowWidth) {
			x = currentMouseX - rect.width - 10;
		}

		// If popup goes off bottom edge, show above cursor
		if (y + rect.height > windowHeight) {
			y = currentMouseY - rect.height - 10;
		}

		x = Math.max(0, Math.min(x, windowWidth - rect.width));
		y = Math.max(0, Math.min(y, windowHeight - rect.height));

		return { x, y };
	});

	onMount(() => {
		mounted = true;

		if (!mousePosition) {
			window.addEventListener('mousemove', handleMouseMove);

			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
			};
		}
	});
</script>

{#if visible && mounted}
	<div
		bind:this={popupElement}
		class="mouse-popup {className}"
		style="left: {popupPosition().x}px; top: {popupPosition().y}px;"
	>
		{#if children}
			{@render children()}
		{:else if content}
			{content}
		{/if}
	</div>
{/if}

<style>
	.mouse-popup {
		position: fixed;
		background: rgba(0, 0, 0, 0.9);
		color: white;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 14px;
		line-height: 1.4;
		max-width: 300px;
		pointer-events: none;
		z-index: 10000;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transform: translateZ(0);
		will-change: transform;
		white-space: pre-line;
		text-align: start;
		transition:
			left 0.15s ease-out,
			top 0.15s ease-out;
	}
</style>
