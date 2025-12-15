#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BUILDING_2025_PATH = path.join(__dirname, '../database_base/building_2025.json');
const BUILDING_UV_DIR = path.join(__dirname, '../uv_images');
const TEXTURE_OUTPUT_DIR = path.join(__dirname, '../building_uv');
const DISPLAY_OUTPUT_DIR = path.join(__dirname, '../building_ui');
const PADDING = 20;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
    // Create output directory
    if (!fs.existsSync(TEXTURE_OUTPUT_DIR)) {
        fs.mkdirSync(TEXTURE_OUTPUT_DIR, { recursive: true });
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

            const spriteSheetImage = await loadImage(spriteSheetPath);

            const imageBuffer = await combineSprites({
                spriteSheet: spriteSheetImage,
                sprites: building.sprites,
                spriteModifiers: building.spriteModifiers,
            });
            // Save output
            const outputPath = path.join(TEXTURE_OUTPUT_DIR, `${building.name}.png`);
            fs.writeFileSync(outputPath, imageBuffer);
            successCount++;
        } catch (err) {
            console.error(`Failed to generate ${building.name}:`, err.message);
            failedCount++;
        }
    }

    console.log(`\nDone! Generated ${successCount} sprites in ${TEXTURE_OUTPUT_DIR}`);
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
 * @param {Array} params.spriteModifiers - Modifier array [{name, translation, scale, rotation, flipX, flipY}]
 *                                         Draw order: first in array = on top, last in array = at back
 * @param {Object} [params.options] - Optional settings
 * @param {number} [params.options.padding] - Padding for auto-fit (default: 20)
 */
async function combineSprites({ spriteSheet, sprites, spriteModifiers }) {
    // Build sprite lookup map
    const spriteMap = {};
    for (const sprite of sprites) {
        spriteMap[sprite.name] = sprite;
    }

    // Calculate or use manual canvas size and origin
    const calculated = calculateCanvasAndOrigin(spriteModifiers, spriteMap);
    const canvasWidth = calculated.canvasWidth;
    const canvasHeight = calculated.canvasHeight;
    const originX = calculated.originX;
    const originY = calculated.originY;

    // Create canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Draw order: REVERSE the array so first item is drawn LAST (on top)
    // Array order: [top, middle, back]
    // Draw order: back first, middle second, top last
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

    // Get buffer
    let buffer = canvas.toBuffer('image/png');

    // Trim if requested
    // if (trim) {
    buffer = await trimImage(buffer);
    // }

    return buffer;
    // return canvas.toBuffer('image/png');
}

async function trimImage(buffer) {
    try {
        let image = sharp(buffer);

        // Trim transparent pixels
        image = image.trim({
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            threshold: 10,
        });

        // const metadata = await image.metadata();
        const POST_PADDING = 0;
        image = image.extend({
            top: POST_PADDING,
            bottom: POST_PADDING,
            left: POST_PADDING,
            right: POST_PADDING,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        });

        return await image.png().toBuffer();
    } catch (err) {
        console.warn('Trim failed, returning original:', err.message);
        return buffer;
    }
}

// ============ CANVAS SIZE & ORIGIN ============
/**
 * Calculate canvas dimensions and origin point
 * Coordinate system: +X right, +Y up (game coordinates)
 * Canvas: +X right, +Y down
 */
function calculateCanvasAndOrigin(modifiers, spriteMap) {
    let minX = Infinity,
        maxX = -Infinity;
    let minY = Infinity,
        maxY = -Infinity;

    for (const mod of modifiers) {
        const sprite = spriteMap[mod.name];
        if (!sprite) continue;

        // Get transform values
        const tx = mod.translation?.x || 0;
        const ty = mod.translation?.y || 0;
        const sx = Math.abs(mod.scale?.x || 1);
        const sy = Math.abs(mod.scale?.y || 1);

        // Sprite dimensions after scale
        const w = sprite.uvSize.x * sx;
        const h = sprite.uvSize.y * sy;

        // Pivot offset (in scaled sprite space)
        const pivotX = sprite.pivot.x * w;
        const pivotY = sprite.pivot.y * h;

        // Calculate bounds in game coordinates (Y+ up)
        // The sprite extends from pivot point
        const left = tx - pivotX;
        const right = tx + (w - pivotX);
        const bottom = ty - pivotY;
        const top = ty + (h - pivotY);

        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, bottom);
        maxY = Math.max(maxY, top);
    }

    // Handle empty case
    if (!isFinite(minX)) {
        return { canvasWidth: 100, canvasHeight: 100, originX: 50, originY: 50 };
    }

    // Canvas dimensions
    const canvasWidth = Math.ceil(maxX - minX + PADDING * 2);
    const canvasHeight = Math.ceil(maxY - minY + PADDING * 2);

    // Origin point on canvas
    // This is where game coordinate (0,0) maps to on the canvas
    // X: offset from left edge
    // Y: offset from top edge (flipped, so maxY maps to top)
    const originX = Math.round(PADDING - minX);
    const originY = Math.round(PADDING + maxY); // Flip Y: top of game space = top of canvas

    return { canvasWidth, canvasHeight, originX, originY };
}

// ============ DRAW SPRITE ============
/**
 * Draw a single sprite with transforms
 * Game coordinates: +X right, +Y up, rotation counter-clockwise positive
 * Canvas coordinates: +X right, +Y down, rotation clockwise positive
 */
function drawSprite(ctx, spriteSheet, sprite, mod, originX, originY) {
    // Source rectangle from sprite sheet
    const srcX = sprite.uvMin.x;
    const srcY = sprite.uvMin.y;
    const srcW = sprite.uvSize.x;
    const srcH = sprite.uvSize.y;

    // Translation (game coordinates)
    const tx = mod.translation?.x || 0;
    const ty = mod.translation?.y || 0;

    // Convert to canvas position (flip Y)
    const canvasX = originX + tx;
    const canvasY = originY - ty; // Flip Y: game Y+ up → canvas Y+ down

    // Pivot point in sprite pixels
    const pivotX = sprite.pivot.x * srcW;
    const pivotY = sprite.pivot.y * srcH;

    // Scale with flip support
    const scaleX = (mod.scale?.x || 1) * (mod.flipX ? -1 : 1);
    const scaleY = (mod.scale?.y || 1) * (mod.flipY ? -1 : 1);

    // Rotation: game uses counter-clockwise positive, canvas uses clockwise positive
    const rotationDeg = mod.rotation || 0;
    const rotation = (-rotationDeg * Math.PI) / 180; // Negate for canvas

    // Draw with transforms
    ctx.save();

    // 1. Move to position (where pivot point should be)
    ctx.translate(canvasX, canvasY);

    // 2. Apply rotation around pivot
    if (rotation !== 0) {
        ctx.rotate(rotation);
    }

    // 3. Apply scale (including flip)
    ctx.scale(scaleX, scaleY);

    // 4. Draw sprite offset by pivot
    // In game coordinates with Y+ up, pivot.y=0 is bottom, pivot.y=1 is top
    // On canvas with Y+ down, we need to flip the Y offset
    ctx.drawImage(
        spriteSheet,
        srcX,
        srcY,
        srcW,
        srcH, // Source rectangle
        -pivotX,
        pivotY - srcH,
        srcW,
        srcH // Destination: offset so pivot is at origin
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
