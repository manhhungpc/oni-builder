<script lang="ts">
    import { Assets } from "pixi.js";
    
    const gridRows = 200;
    const gridCols = 200;

    async function loadSprite() {
        const plumbingAssets = [
            {
                alias: "liquid_pump",
                src: "src/assets/LiquidPump.png",
            },
        ];

        await Assets.load(plumbingAssets);
    }

    $effect(() => {
        loadSprite();
    });
</script>
