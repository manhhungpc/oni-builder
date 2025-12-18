<script lang="ts">
	import { Sprite, Container, Assets } from 'pixi.js';
	import { blueprint } from '$lib/state/blueprint.svelte';
	import { appConfig } from '$lib/state/config.svelte';
	import { PORT, CELL_SIZE } from '$lib/constant';
	import { gridToWorld } from '$lib/utils/grid/transform';
	import { OVERLAY } from '$lib/constant';
	import type { SvelteMap } from 'svelte/reactivity';
	import type { ConduitNode } from 'src/interface/building';
	import { onMount } from 'svelte';
	import type { PlacedBuildings } from 'src/interface';

	interface Props {
		overlayType: OVERLAY;
		ports: Map<string, PORT>;
		connections: SvelteMap<string, ConduitNode>;
		containerLabel?: string;
	}

	let { overlayType, ports, connections, containerLabel }: Props = $props();

	let overlayContainer: Container | null = null;
	let portSpriteInput = '',
		portSpriteOutput = '';

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

	// function getPortSpriteAlias() {
	// 	if (
	// 		overlayType == OVERLAY.PLUMBING ||
	// 		overlayType == OVERLAY.VENTILATION ||
	// 		overlayType == OVERLAY.SHIPPING
	// 	) {
	// 		portSpriteInput = 'conduit_input';
	// 		portSpriteOutput = 'conduit_output';
	// 	}

	// 	if (overlayType == OVERLAY.POWER) {
	// 		portSpriteInput = 'power_port';
	// 		portSpriteOutput = 'power_port';
	// 	}

	// 	if (overlayType == OVERLAY.AUTOMATION) {
	// 		portSpriteInput = 'logic_input';
	// 		portSpriteOutput = 'logic_output';
	// 	}
	// }

	// Load sprites only in the browser
	onMount(() => {
		loadConduitSprites();
	});

	$effect(() => {
		// Skip SSR
		if (typeof window === 'undefined') return;

		const buildContainer = blueprint.buildContainer;
		const currentOverlay = appConfig.selectedOverlay;

		if (!buildContainer) return;

		if (!overlayContainer) {
			overlayContainer = new Container();
			overlayContainer.label = containerLabel || '';
			overlayContainer.zIndex = 99; // Set high z-index on the container itself
			buildContainer.addChild(overlayContainer);
		}

		// Control visibility based on overlay
		const isActiveOverlay = currentOverlay === overlayType;
		overlayContainer.visible = isActiveOverlay;

		blueprint.gridRenderer?.draw(currentOverlay != OVERLAY.BUILDING);
		// if (currentOverlay != OVERLAY.BUILDING) {
		// }

		connections.forEach((nodeData: ConduitNode) => {
			if (nodeData.metadata.sprite) {
				nodeData.metadata.sprite.alpha = isActiveOverlay ? FULL_OPACITY : DEFAULT_OPACITY;
				nodeData.metadata.sprite.zIndex = isActiveOverlay ? 100 : 1;
			}
		});

		blueprint.placedBuildings.map((building: PlacedBuildings) => {
			if (!building.sprite) {
				return;
			}
			if (building.view_mode == appConfig.selectedOverlay) {
				building.sprite.zIndex = 99;
			} else {
				building.sprite.zIndex = building.scene_layer;
			}

			// Update port visibility based on current overlay
			if (building.ports) {
				for (const port of building.ports) {
					if (port.sprite) {
						port.sprite.visible = port.category == currentOverlay;
					}
				}
			}
		});

		return () => {
			if (overlayContainer && buildContainer) {
				buildContainer.removeChild(overlayContainer);
				overlayContainer.destroy({ children: true });
				overlayContainer = null;
			}
		};
	});
</script>
