<script lang="ts">
    import { CELL_SIZE } from 'src/lib/constant';
    import { onMount } from 'svelte';

    interface Props {
        visible?: boolean;
        content?: string;
        className?: string;
        gridSize?: number;
        mousePosition?: { x: number; y: number } | null;
        children?: any;
    }

    let {
        visible = true,
        content = '',
        className = '',
        gridSize = CELL_SIZE, // Default grid size
        mousePosition = null,
        children,
    }: Props = $props();

    let mouseX = $state(0);
    let mouseY = $state(0);
    let popupElement: HTMLDivElement | null = $state(null);
    let mounted = $state(false);

    function handleMouseMove(event: MouseEvent) {
        mouseX = event.clientX;
        mouseY = event.clientY;
    }

    function getGridCell(value: number, gridSize: number): number {
        return Math.floor(value / gridSize) * gridSize;
    }

    // Calculate popup position with boundary checking
    const popupPosition = $derived(() => {
        if (!mounted || !popupElement) return { x: null, y: null };

        const rect = popupElement.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const currentMouseX = mousePosition?.x ?? mouseX;
        const currentMouseY = mousePosition?.y ?? mouseY;

        // Use mouse position to find current grid cell
        const gridCellX = getGridCell(currentMouseX, gridSize);
        const gridCellY = getGridCell(currentMouseY, gridSize);

        // Position popup centered below the current grid cell with additional offset
        let x = gridCellX + gridSize / 2 - rect.width / 2;
        let y = gridCellY + gridSize + 10; // 1 full grid below + 10px offset

        // If doesn't fit vertically, try sides
        if (y < 0) {
            y = gridCellY + gridSize / 2 - rect.height / 2;

            // Try right side
            x = gridCellX + gridSize;

            // Try left side
            if (x + rect.width > windowWidth) {
                x = gridCellX - rect.width;
            }
        }

        // Final boundary checks to keep popup visible
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
        transition:
            left 0.15s ease-out,
            top 0.15s ease-out;
    }
</style>
