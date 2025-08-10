<script lang="ts">
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import TooltipTrigger from "./tooltip-trigger.svelte";
	import TooltipContent from "./tooltip-content.svelte";
	
	let {
		trigger,
		content,
		delayDuration = 0,
		side = "top",
		sideOffset = 0,
		arrowClasses,
		contentClass,
		...restProps
	}: {
		trigger: import("svelte").Snippet;
		content: import("svelte").Snippet;
		delayDuration?: number;
		side?: "top" | "right" | "bottom" | "left";
		sideOffset?: number;
		arrowClasses?: string;
		contentClass?: string;
		[key: string]: any;
	} = $props();
</script>

<TooltipPrimitive.Provider {delayDuration}>
	<TooltipPrimitive.Root {...restProps}>
		<TooltipTrigger>
			{@render trigger()}
		</TooltipTrigger>
		<TooltipContent 
			{side} 
			{sideOffset} 
			{arrowClasses}
			class={contentClass}
		>
			{@render content()}
		</TooltipContent>
	</TooltipPrimitive.Root>
</TooltipPrimitive.Provider>