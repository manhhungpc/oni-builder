<script lang="ts">
	import { Assets } from 'pixi.js';
	import { blueprint } from '$lib/state/blueprint.svelte';
	import { appConfig } from '$lib/state/config.svelte';
	import {
		HIGHLIGHT_CONDUIT_LAYER,
		HIGHLIGHT_BUILDING_LAYER,
		HIGHLIGHT_PORT_LAYER
	} from '$lib/constant';
	import { OVERLAY } from '$lib/constant';
	import type { SvelteMap } from 'svelte/reactivity';
	import type { ConduitNode } from 'src/interface/building';
	import { onMount } from 'svelte';
	import type { PlacedBuildings } from 'src/interface';

	interface Props {
		overlayType: OVERLAY;
		connections: SvelteMap<string, ConduitNode>;
	}

	let { overlayType, connections }: Props = $props();

	// Opacity constants
	const DEFAULT_OPACITY = 0.5;
	const FULL_OPACITY = 1.0;

	// Load conduit sprites on component mount
	async function loadConduitSprites() {
		const portSpriteAlias = [
			'conduit_input',
			'conduit_output',
			'power_port',
			'logic_input',
			'logic_output'
		];

		try {
			await Assets.load(
				portSpriteAlias.map((alias) => ({
					alias,
					src: `../../src/assets/ports/${alias}.png`
				}))
			);
		} catch (error) {
			console.error('Failed to load conduit sprites:', error);
		}
	}

	// Load sprites only in the browser
	onMount(() => {
		loadConduitSprites();
	});

	$effect(() => {
		// Skip SSR
		if (typeof window === 'undefined') return;

		// Control visibility based on overlay
		const isActiveOverlay = appConfig.selectedOverlay === overlayType;

		blueprint.gridRenderer?.draw(appConfig.selectedOverlay != OVERLAY.BUILDING);

		connections.forEach((nodeData: ConduitNode) => {
			if (nodeData.metadata.sprite) {
				nodeData.metadata.sprite.alpha = isActiveOverlay ? FULL_OPACITY : DEFAULT_OPACITY;
				nodeData.metadata.sprite.zIndex = isActiveOverlay ? HIGHLIGHT_CONDUIT_LAYER : 1;
			}
		});

		blueprint.placedBuildings.map((building: PlacedBuildings) => {
			if (!building.sprite) {
				return;
			}
			if (building.view_mode == appConfig.selectedOverlay) {
				building.sprite.zIndex = HIGHLIGHT_BUILDING_LAYER;
			} else {
				building.sprite.zIndex = building.scene_layer;
			}

			// Update port visibility based on current overlay
			if (building.ports) {
				for (const port of building.ports) {
					if (port.sprite) {
						port.sprite.visible = port.category == appConfig.selectedOverlay;
						port.sprite.zIndex = HIGHLIGHT_PORT_LAYER;
					}
				}
			}
		});
	});
</script>
