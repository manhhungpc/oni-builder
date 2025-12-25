import { Assets, Sprite, Application } from 'pixi.js';
import { CELL_SIZE } from '$lib/constant';
import type { AssetConfig } from 'src/interface';
import type { IBuilding } from 'src/interface/building';
import type { PlacementState } from 'src/interface/building';
import { getAliasFromPath } from '$lib/utils/helpers';
import { blueprint } from 'src/lib/state/blueprint.svelte';

export async function loadSprites(
	buildings: IBuilding[],
	baseImgPath = import.meta.env.VITE_API_URL
): Promise<void> {
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

export function cleanupAttachSprite(placementState: PlacementState, app: Application | null): void {
	// Remove and destroy preview container if it exists
	const container = blueprint.buildContainer;
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
	options: {
		zIndex: number;
	}
): Sprite {
	let sprite: Sprite;

	if (building.special_texture.length > 0) {
		// Sprite for conduit
		const defaultTextureUrl = building.special_texture.find((url) => url.endsWith('_None.png'));

		if (!defaultTextureUrl) {
			throw new Error('No default texture found');
		}

		const aliasName = getAliasFromPath(defaultTextureUrl);
		sprite = Sprite.from(aliasName);
		sprite.position.set(
			(building.width * CELL_SIZE - sprite.width) / 2,
			(building.height * CELL_SIZE - sprite.height) / 2
		);
	} else {
		// Sprite for building
		sprite = Sprite.from(building.name);
		sprite.position.set(
			(building.width * CELL_SIZE - sprite.width) / 2,
			(building.height * CELL_SIZE - sprite.height) / 2
		);
	}

	sprite.zIndex = options.zIndex;

	blueprint.buildContainer?.addChild(sprite);

	return sprite;
}
