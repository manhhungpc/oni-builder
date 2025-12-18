import * as PIXI from 'pixi.js';
import { Assets, Sprite, Container, Application } from 'pixi.js';
import { CELL_SIZE } from '$lib/constant';
import type { AssetConfig } from 'src/interface';
import type { IBuilding } from 'src/interface/building';
import type { PlacementState } from 'src/interface/building';
import { getAliasFromPath } from '$lib/utils/helpers';

export async function loadSprites(buildings: IBuilding[], baseImgPath?: string): Promise<void> {
	const assetsToLoad: AssetConfig[] = [];

	for (const building of buildings) {
		assetsToLoad.push({
			alias: building.name,
			src: baseImgPath + '/draw_images/' + building.name + '.png'
		});

		if (building.special_texture.length > 0) {
			for (const texturePath of building.special_texture) {
				const alias = getAliasFromPath(texturePath);
				assetsToLoad.push({
					alias: alias,
					src: baseImgPath + '/' + texturePath
				});
			}
		}
	}

	// Load in parallel but handle individual failures
	const loadAll = await Promise.allSettled(assetsToLoad.map((asset) => Assets.load(asset)));

	loadAll.forEach((result, i) => {
		if (result.status === 'rejected') {
			console.warn(`Failed to load: ${assetsToLoad[i].src}`);
		}
	});
}

export function cleanupAttachSprite(
	placementState: PlacementState,
	container: Container | null,
	app: Application | null
): void {
	// Remove and destroy preview container if it exists
	if (placementState.previewContainer && container) {
		container.removeChild(placementState.previewContainer);
		placementState.previewContainer.destroy({ children: true });
		placementState.previewContainer = null;
	}

	// Remove sprite from container (only if no preview container)
	if (placementState.sprite && container && !placementState.previewContainer) {
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

		if (!defaultTextureUrl) {
			throw new Error('No default texture found');
		}

		const aliasName = getAliasFromPath(defaultTextureUrl);
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
