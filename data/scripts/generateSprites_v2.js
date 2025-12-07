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
const PADDING = 30;

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

    // Calculate canvas size and origin (matching HTML autoFitCanvas)
    const { canvasWidth, canvasHeight, originX, originY } = calculateCanvasAndOrigin(
        spriteModifiers,
        spriteMap
    );

    // Create canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Optionally reverse draw order
    const drawOrder = [...spriteModifiers].reverse();

    // Draw each sprite in order
    let drawnCount = 0;
    for (const mod of drawOrder) {
        const sprite = spriteMap[mod.name];
        if (!sprite) {
            console.warn(`  Warning: sprite "${mod.name}" not found`);
            continue;
        }

        drawSprite(ctx, spriteSheet, sprite, mod, originX, originY);
        drawnCount++;
    }

    return canvas.toBuffer('image/png');
}

// ============ CANVAS SIZE & ORIGIN (matching HTML autoFitCanvas) ============
function calculateCanvasAndOrigin(modifiers, spriteMap) {
    let minX = Infinity,
        maxX = -Infinity;
    let minY = Infinity,
        maxY = -Infinity;

    for (const mod of modifiers) {
        // Apply translation scale
        const tx = (mod.translation?.x || 0) * TRANSLATION_SCALE;
        const ty = (mod.translation?.y || 0) * TRANSLATION_SCALE;

        // Get sprite size
        const sprite = spriteMap[mod.name];
        const w = sprite ? sprite.uvSize.x : 50;
        const h = sprite ? sprite.uvSize.y : 50;

        // Estimate sprite bounds around translation point
        // IMPORTANT: Use w/2 and h/2 (matching HTML)
        minX = Math.min(minX, tx - w / 2);
        maxX = Math.max(maxX, tx + w / 2);
        minY = Math.min(minY, ty - h / 2);
        maxY = Math.max(maxY, ty + h / 2);
    }

    // Handle empty case
    if (!isFinite(minX)) {
        return { canvasWidth: 100, canvasHeight: 100, originX: 50, originY: 50 };
    }

    // Canvas size
    const canvasWidth = Math.ceil(maxX - minX + PADDING * 2);
    const canvasHeight = Math.ceil(maxY - minY + PADDING * 2);

    // Origin calculation (matching HTML autoFitCanvas exactly)
    let originX, originY;

    // No flip mode (standard)
    // HTML: originX = padding - minX, originY = padding - minY
    originX = Math.round(PADDING - minX);
    originY = Math.round(PADDING - minY);

    return { canvasWidth, canvasHeight, originX, originY };
}

// ============ DRAW SPRITE (matching HTML render/downloadImage) ============
function drawSprite(ctx, spriteSheet, sprite, mod, originX, originY) {
    // Source rectangle from sprite sheet
    const srcX = sprite.uvMin.x;
    const srcY = sprite.uvMin.y;
    const srcW = sprite.uvSize.x;
    const srcH = sprite.uvSize.y;

    // Position calculation (matching HTML)
    const tx = (mod.translation?.x || 0) * TRANSLATION_SCALE;
    const ty = (mod.translation?.y || 0) * TRANSLATION_SCALE;
    const posX = originX + tx;
    const posY = originY + ty;

    // Anchor point in pixels (matching HTML)
    const anchorX = sprite.pivot.x * srcW;
    const anchorY = sprite.pivot.y * srcH;

    // Scale
    const scaleX = mod.scale?.x || 1;
    const scaleY = mod.scale?.y || 1;

    // Rotation in radians (matching HTML)
    const rotationDeg = mod.rotation || 0;
    const rotation = (rotationDeg * Math.PI) / 180;

    // Draw with transforms (matching HTML exactly)
    ctx.save();

    // Move to position
    ctx.translate(posX, posY);

    // Rotate
    if (rotation !== 0) {
        ctx.rotate(rotation);
    }

    // Scale
    ctx.scale(scaleX, scaleY);

    // Draw sprite with anchor at origin
    ctx.drawImage(
        spriteSheet,
        srcX,
        srcY,
        srcW,
        srcH, // Source rectangle
        -anchorX,
        -anchorY,
        srcW,
        srcH // Destination (offset by -anchor)
    );

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
