import * as PIXI from 'pixi.js';
import { Assets, Sprite, Container, Application } from 'pixi.js';
import { CELL_SIZE } from 'src/lib/constant';
import type { AssetConfig } from 'src/interface';
import type { IBuilding } from '@shared/src/interface';
import type { PlacementState } from 'src/interface/building';
import { getAliasFromUrl } from 'src/utils/helper';

export const drawInfiniteGrid = (
    container: PIXI.Container | null,
    zoom: number,
    offsetX: number,
    offsetY: number,
    viewWidth: number,
    viewHeight: number
) => {
    if (!container) return;

    container.removeChildren(); // Clear existing grid lines

    const gridLines = new PIXI.Graphics();

    const cellSizeScaled = CELL_SIZE * zoom;

    // Only draw grid lines if they're not too dense
    if (cellSizeScaled > 2) {
        // Calculate visible grid bounds
        const startCol = Math.floor(-offsetX / CELL_SIZE) - 1;
        const endCol = Math.ceil((-offsetX + viewWidth / zoom) / CELL_SIZE) + 1;
        const startRow = Math.floor(-offsetY / CELL_SIZE) - 1;
        const endRow = Math.ceil((-offsetY + viewHeight / zoom) / CELL_SIZE) + 1;

        // Draw vertical lines
        for (let col = startCol; col <= endCol; col++) {
            const x = col * CELL_SIZE;
            gridLines.moveTo(x, startRow * CELL_SIZE);
            gridLines.lineTo(x, endRow * CELL_SIZE);
            gridLines.stroke({ width: 1 / zoom, color: 0x888888, alpha: 0.5 });
        }

        // Draw horizontal lines
        for (let row = startRow; row <= endRow; row++) {
            const y = row * CELL_SIZE;
            gridLines.moveTo(startCol * CELL_SIZE, y);
            gridLines.lineTo(endCol * CELL_SIZE, y);
            gridLines.stroke({ width: 1 / zoom, color: 0x888888, alpha: 0.5 });
        }
    }

    container.addChild(gridLines);
};

export async function loadSprites(buildings: IBuilding[], baseImgPath?: string): Promise<void> {
    const assetsToLoad: AssetConfig[] = [];

    for (const building of buildings) {
        assetsToLoad.push({
            alias: building.name,
            src: baseImgPath + building.name + '.png',
        });

        if (building.special_texture.length > 0) {
            for (const urlTexture of building.special_texture) {
                const alias = getAliasFromUrl(urlTexture);
                assetsToLoad.push({
                    alias: alias,
                    src: urlTexture,
                });
            }
        }
    }

    await Assets.load(assetsToLoad);
}

export function cleanupPlacement(
    placementState: PlacementState,
    container: Container | null,
    app: Application | null
): void {
    // Remove sprite from container
    if (placementState.sprite && container) {
        container.removeChild(placementState.sprite);
        placementState.sprite.destroy();
        placementState.sprite = null;
    }

    if (placementState.mouseMoveHandler && app) {
        app.stage?.removeEventListener('pointermove', placementState.mouseMoveHandler);
        placementState.mouseMoveHandler = null;
    }

    if (placementState.clickHandler && app) {
        app.stage?.removeEventListener('pointerdown', placementState.clickHandler);
        placementState.clickHandler = null;
    }
}

// Create a placement sprite with grid snapping
export function createPlacementSprite(
    building: IBuilding,
    container: Container,
    options: {
        zIndex: number;
    }
): Sprite {
    let sprite: Sprite;

    if (building.special_texture.length > 0) {
        const defaultTextureUrl = building.special_texture.find((url) => url.endsWith('_None.png'));

        const aliasName = getAliasFromUrl(defaultTextureUrl ?? '');
        sprite = Sprite.from(aliasName);
    } else {
        sprite = Sprite.from(building.name);
    }

    sprite.zIndex = options.zIndex;

    // Scale to grid size
    sprite.width = building.width * CELL_SIZE;
    sprite.height = building.height * CELL_SIZE;

    container.addChild(sprite);

    return sprite;
}
