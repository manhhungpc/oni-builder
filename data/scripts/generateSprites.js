#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BUILDING_2025_PATH = path.join(__dirname, '../database_base/building_2025.json');
const BUILDING_UV_DIR = path.join(__dirname, '../building_uv');
const OUTPUT_DIR = path.join(__dirname, '../generated_sprites');

const TRANSLATION_SCALE = 0.5; // Always divide translation by 2
const PADDING = 5;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Load building data
    console.log('Loading building data from building_2025.json...');
    const buildingData = loadBuildingData();
    console.log(`Loaded ${buildingData.length} buildings to process\n`);

    // Generate sprites
    console.log('Generating sprites...\n');
    let successCount = 0;
    let failedCount = 0;

    for (const building of buildingData) {
        try {
            // Get the sprite sheet path
            const spriteSheetPath = path.join(BUILDING_UV_DIR, `${building.textureName}.png`);

            if (!fs.existsSync(spriteSheetPath)) {
                console.warn(`Sprite sheet not found: ${spriteSheetPath}`);
                // return;
                continue;
            }
            // console.log('🐧 ~ main ~ building:', building);
            // await generateSprite(building);
            // Load sprite sheet image
            const spriteSheetImage = await loadImage(spriteSheetPath);

            const imageBuffer = combineSprites({
                spriteSheet: spriteSheetImage,
                sprites: building.sprites,
                spriteModifiers: building.spriteModifiers,
            });
            // Save output
            const outputPath = path.join(OUTPUT_DIR, `${building.name}.png`);
            fs.writeFileSync(outputPath, imageBuffer);
            successCount++;
        } catch (err) {
            console.error(`Failed to generate ${building.name}:`, err.message);
            failedCount++;
        }
    }

    console.log(`\nDone! Generated ${successCount} sprites in ${OUTPUT_DIR}`);
    if (failedCount > 0) {
        console.log(`Failed: ${failedCount} sprites`);
    }
}

// ============ CORE FUNCTION ============
/**
 * Combine sprites into a single image
 *
 * @param {Object} params
 * @param {Image} params.spriteSheet - Loaded image (from loadImage)
 * @param {Array} params.sprites - Sprite info array [{name, uvMin, uvSize, pivot}]
 * @param {Array} params.spriteModifiers - Modifier array [{name, translation, scale, rotation}]
 */
function combineSprites({ spriteSheet, sprites, spriteModifiers }) {
    // Build sprite lookup map
    const spriteMap = {};
    for (const sprite of sprites) {
        spriteMap[sprite.name] = sprite;
    }

    // Calculate bounds
    const bounds = calculateBounds(spriteModifiers, spriteMap);
    const canvasWidth = Math.ceil(bounds.maxX - bounds.minX + PADDING * 2);
    const canvasHeight = Math.ceil(bounds.maxY - bounds.minY + PADDING * 2);
    // const originX = -bounds.minX + PADDING;
    // const originY = -bounds.maxY + PADDING; // Flip Y
    const originX = PADDING - bounds.minX;
    const originY = PADDING - bounds.minY;

    // Create canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw each sprite
    let drawnCount = 0;
    for (const mod of spriteModifiers) {
        const sprite = spriteMap[mod.name];
        if (!sprite) continue;

        drawSprite(ctx, spriteSheet, sprite, mod, originX, originY);
        drawnCount++;
    }

    return canvas.toBuffer('image/png');
}

// ============ HELPER FUNCTIONS ============
function calculateBounds(modifiers, spriteMap) {
    let minX = Infinity,
        maxX = -Infinity;
    let minY = Infinity,
        maxY = -Infinity;

    for (const mod of modifiers) {
        const tx = (mod.translation?.x || 0) * TRANSLATION_SCALE;
        const ty = (mod.translation?.y || 0) * TRANSLATION_SCALE;
        const sprite = spriteMap[mod.name];
        const w = sprite ? sprite.uvSize.x : 50;
        const h = sprite ? sprite.uvSize.y : 50;

        minX = Math.min(minX, tx - w / 2);
        maxX = Math.max(maxX, tx + w / 2);
        minY = Math.min(minY, ty - h / 2);
        maxY = Math.max(maxY, ty + h / 2);
    }

    return { minX, maxX, minY, maxY };
}

function drawSprite(ctx, spriteSheet, sprite, mod, originX, originY) {
    // Source rectangle
    const srcX = sprite.uvMin.x;
    const srcY = sprite.uvMin.y;
    const srcW = sprite.uvSize.x;
    const srcH = sprite.uvSize.y;

    // Position (scale by 0.5, flip Y)
    const posX = originX + (mod.translation?.x || 0) * TRANSLATION_SCALE;
    const posY = originY + (mod.translation?.y || 0) * TRANSLATION_SCALE;

    // Anchor (flip pivot Y)
    const anchorX = sprite.pivot.x * srcW;
    const anchorY = (1 - sprite.pivot.y) * srcH;

    // Rotation (negate for Y-flip)
    const rotation = (-(mod.rotation || 0) * Math.PI) / 180;

    // Scale
    const scaleX = mod.scale?.x || 1;
    const scaleY = mod.scale?.y || 1;

    // Draw
    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate(rotation);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(spriteSheet, srcX, srcY, srcW, srcH, -anchorX, -anchorY, srcW, srcH);
    ctx.restore();
}

// ============================================================================
// DATA LOADING
// ============================================================================

function loadBuildingData() {
    const rawData = fs.readFileSync(BUILDING_2025_PATH, 'utf8');
    const data = JSON.parse(rawData);

    const buildingsToProcess = [];

    // Create a lookup map for bBuildingDefList by name
    const buildingDefMap = {};
    data.bBuildingDefList.forEach((building) => {
        buildingDefMap[building.name] = building;
    });

    // Process each building in buildingDefs
    data.buildingDefs.forEach((buildingDef) => {
        const prefabID = buildingDef.PrefabID;
        const textureName = buildingDef.TextureName;

        if (!prefabID || !textureName) {
            return;
        }

        // Skip _place_0 and _ui_0 textures
        if (textureName.endsWith('_place_0') || textureName.endsWith('_ui_0')) {
            return;
        }

        const buildingDefListEntry = buildingDefMap[prefabID];

        if (!buildingDefListEntry) {
            console.warn(`No bBuildingDefList entry found for PrefabID: ${prefabID}`);
            return;
        }

        if (
            !buildingDefListEntry.sprites ||
            !buildingDefListEntry.spriteModifiers ||
            buildingDefListEntry.sprites.length === 0 ||
            buildingDefListEntry.spriteModifiers.length === 0
        ) {
            return;
        }

        buildingsToProcess.push({
            name: prefabID,
            textureName: textureName,
            sprites: buildingDefListEntry.sprites,
            spriteModifiers: buildingDefListEntry.spriteModifiers,
        });
    });

    return buildingsToProcess;
}

// ============================================================================
// RUN
// ============================================================================

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
