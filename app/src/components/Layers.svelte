<script lang="ts">
    import { Sprite, Container, Assets } from 'pixi.js';
    import { globalState } from 'src/lib/universal/globalState.svelte';
    import { PORT, CELL_SIZE } from 'src/lib/constant';
    import { gridToWorld } from 'src/lib/helpers/gridTransform';
    import { OVERLAY } from '@shared/src/enum';
    import type { SvelteMap } from 'svelte/reactivity';
    import type { NodeData } from 'src/interface/building';

    interface Props {
        overlayType: OVERLAY;
        ports: Map<string, PORT>;
        connections: SvelteMap<string, NodeData>;
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
        if (
            overlayType == OVERLAY.PLUMBING ||
            overlayType == OVERLAY.VENTILATION ||
            overlayType == OVERLAY.SHIPPING
        ) {
            portSpriteInput = 'conduit_input';
            portSpriteOutput = 'conduit_output';
        }

        if (overlayType == OVERLAY.POWER) {
            portSpriteInput = 'power_port';
            portSpriteOutput = 'power_port';
        }

        if (overlayType == OVERLAY.AUTOMATION) {
            portSpriteInput = 'logic_input';
            portSpriteOutput = 'logic_output';
        }

        try {
            await Assets.load([
                { alias: portSpriteInput, src: `images/ports/${portSpriteInput}.png` },
                { alias: portSpriteOutput, src: `images/ports/${portSpriteOutput}.png` },
            ]);
        } catch (error) {
            console.error('Failed to load conduit sprites:', error);
        }
    }

    loadConduitSprites();

    $effect(() => {
        const buildContainer = globalState.buildContainer;
        const currentOverlay = globalState.currentOverlays;

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

        connections.forEach((nodeData: NodeData) => {
            if (nodeData.metadata.sprite) {
                nodeData.metadata.sprite.alpha = isActiveOverlay ? FULL_OPACITY : DEFAULT_OPACITY;
            }
        });

        // Draw port sprites for each port
        ports.forEach((portType, gridKey) => {
            const [gridX, gridY] = gridKey.split(',').map(Number);

            const worldPos = gridToWorld(gridX, gridY);

            const spriteName = portType === PORT.INPUT ? portSpriteInput : portSpriteOutput;

            try {
                const portSprite = Sprite.from(spriteName);

                portSprite.width = CELL_SIZE / 2;
                portSprite.height = CELL_SIZE / 2;

                // Position the sprite centered in the grid cell
                portSprite.x = worldPos.x + CELL_SIZE / 4;
                portSprite.y = worldPos.y + CELL_SIZE / 4;

                if (overlayContainer) {
                    overlayContainer.addChild(portSprite);
                }
            } catch (error) {
                console.warn(`Failed to create sprite for ${spriteName}:`, error);
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
