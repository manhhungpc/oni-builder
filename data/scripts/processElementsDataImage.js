/**
 * Process Elements Data and Images
 *
 * Usage:
 *   node processElementsDataImage.js --elements_input=/path/to/elements.json --images_input=/path/to/images [--run=1,2,3]
 *
 * Options:
 *   --elements_input  Path to original elements.json (required)
 *   --images_input    Path to source element images folder (required)
 *   --run             Steps to run, comma-separated (default: 1,2,3)
 *
 * Steps:
 *   1 = Extract elements_minimal.json from original elements.json
 *   2 = Copy valid textures from images_input to data/element_images (_0 as-is, non-_0 resized to 100x100)
 *   3 = Crop sprites in data/element_images (extract main sprite and replace in-place)
 *
 * Output:
 *   - elements_minimal.json -> data/database_base/elements_minimal.json
 *   - Processed images -> data/element_images/
 *
 * Examples:
 *   # Run all steps
 *   node processElementsDataImage.js --elements_input=./elements.json --images_input=./raw_images
 *
 *   # Run only step 1 (extract elements_minimal.json)
 *   node processElementsDataImage.js --elements_input=./elements.json --images_input=./raw_images --run=1
 *
 *   # Run steps 1 and 2 (extract + copy/clean)
 *   node processElementsDataImage.js --elements_input=./elements.json --images_input=./raw_images --run=1,2
 *
 *   # Run only step 3 (crop sprites) - requires elements_minimal.json and images in data/element_images
 *   node processElementsDataImage.js --elements_input=./elements.json --images_input=./raw_images --run=3
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Parse command line arguments
const args = process.argv.slice(2);
const elementsInputArg = args.find(arg => arg.startsWith('--elements_input='));
const imagesInputArg = args.find(arg => arg.startsWith('--images_input='));
const runArg = args.find(arg => arg.startsWith('--run='));

// Parse which steps to run (default: all)
const stepsToRun = runArg
    ? runArg.split('=')[1].split(',').map(s => parseInt(s.trim()))
    : [1, 2, 3];

if (!elementsInputArg || !imagesInputArg) {
    console.error('Usage: node processElementsDataImage.js --elements_input=/path/to/elements.json --images_input=/path/to/images [--run=1,2,3]');
    console.error('');
    console.error('Options:');
    console.error('  --elements_input  Path to original elements.json');
    console.error('  --images_input    Path to source element images folder');
    console.error('  --run             Steps to run (default: 1,2,3)');
    console.error('                    1 = Extract elements_minimal.json');
    console.error('                    2 = Copy valid textures (_0 as-is, non-_0 resized to 100x100)');
    console.error('                    3 = Crop sprites in data/element_images');
    process.exit(1);
}

const elementsInputPath = elementsInputArg.split('=')[1];
const imagesInputFolder = imagesInputArg.split('=')[1];
const elementsMinimalPath = path.join(__dirname, '../database_base/elements_minimal.json');
const outputImagesFolder = path.join(__dirname, '../element_images');

if (!fs.existsSync(elementsInputPath)) {
    console.error(`Elements file not found: ${elementsInputPath}`);
    process.exit(1);
}

if (!fs.existsSync(imagesInputFolder)) {
    console.error(`Images input folder not found: ${imagesInputFolder}`);
    process.exit(1);
}

console.log(`Steps to run: ${stepsToRun.join(', ')}`);
console.log(`Output images folder: ${outputImagesFolder}`);

// ============================================================
// STEP 1: Extract elements_minimal.json from original elements.json
// ============================================================
function extractElements() {
    console.log('\n=== STEP 1: Extracting elements_minimal.json ===');

    const data = JSON.parse(fs.readFileSync(elementsInputPath, 'utf8'));

    const elements = Object.entries(data.elementTable).map(([key, element]) => ({
        name: element.name,
        idx: element.idx,
        specificHeatCapacity: element.specificHeatCapacity,
        thermalConductivity: element.thermalConductivity,
        molarMass: element.molarMass,
        maxMass: element.maxMass,
        lowTempTransition: element.lowTempTransition ? { idx: element.lowTempTransition.idx } : null,
        highTempTransition: element.highTempTransition ? { idx: element.highTempTransition.idx } : null,
        substance: element.substance ? {
            name: element.substance.name,
            elementID: element.substance.elementID,
            colour: element.substance.colour,
            uiColour: element.substance.uiColour,
            conduitColour: element.substance.conduitColour,
            anim: element.substance.anim
        } : null,
        IsLiquid: element.IsLiquid,
        IsGas: element.IsGas,
        IsSolid: element.IsSolid,
        IsVacuum: element.IsVacuum,
        IsSlippery: element.IsSlippery
    }));

    fs.writeFileSync(elementsMinimalPath, JSON.stringify(elements, null, 2));
    console.log(`Extracted ${elements.length} elements to ${elementsMinimalPath}`);

    return elements;
}

// ============================================================
// STEP 2: Copy valid textures to data/element_images
// ============================================================
async function copyValidTextures(elements) {
    console.log('\n=== STEP 2: Copying valid textures to data/element_images ===');

    // Create output folder if it doesn't exist
    if (!fs.existsSync(outputImagesFolder)) {
        fs.mkdirSync(outputImagesFolder, { recursive: true });
    }

    // Build list of valid texture names (both _0 and base name)
    const originalNames = new Set(); // names with _0
    const baseNames = new Set();     // names without _0

    elements.forEach(element => {
        const textureName = element.substance?.anim?.textureList?.[0]?.name;
        if (textureName) {
            // Add original name (e.g., "wood_0")
            originalNames.add(textureName);
            // Add base name without _0 (e.g., "wood")
            const baseName = textureName.replace(/_0$/, '');
            baseNames.add(baseName);
        }
    });

    console.log(`Found ${originalNames.size} original names (_0) to copy`);
    console.log(`Found ${baseNames.size} base names to copy and resize to 100x100`);

    // Scan source folder and copy valid files
    const files = fs.readdirSync(imagesInputFolder);
    let copiedCount = 0;
    let resizedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
        const ext = path.extname(file);
        if (ext.toLowerCase() !== '.png') continue;

        const nameWithoutExt = path.basename(file, ext);
        const srcPath = path.join(imagesInputFolder, file);
        const destPath = path.join(outputImagesFolder, file);

        if (originalNames.has(nameWithoutExt)) {
            // Copy _0 files as-is
            const buffer = fs.readFileSync(srcPath);
            fs.writeFileSync(destPath, buffer);
            copiedCount++;
        } else if (baseNames.has(nameWithoutExt)) {
            // Resize non-_0 files to 100x100
            const buffer = fs.readFileSync(srcPath);
            const resizedBuffer = await sharp(buffer)
                .resize(100, 100)
                .png()
                .toBuffer();
            fs.writeFileSync(destPath, resizedBuffer);
            resizedCount++;
        } else {
            skippedCount++;
        }
    }

    console.log(`Copied: ${copiedCount} files`);
    console.log(`Resized to 100x100: ${resizedCount} files`);
    console.log(`Skipped: ${skippedCount} files`);

    return { originalNames, baseNames };
}

// ============================================================
// STEP 3: Crop sprites and replace in-place
// ============================================================
async function findSpriteBounds(imageBuffer) {
    const { data, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    const getAlpha = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return 0;
        return data[(y * width + x) * 4 + 3];
    };

    // Find left margin (scan from left until non-transparent)
    let leftMargin = 0;
    outer1: for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (getAlpha(x, y) > 10) {
                leftMargin = x;
                break outer1;
            }
        }
    }

    // Find top margin (scan from top until non-transparent)
    let topMargin = 0;
    outer2: for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (getAlpha(x, y) > 10) {
                topMargin = y;
                break outer2;
            }
        }
    }

    // Find right edge of the main sprite (look for transparent column gap after content)
    let rightEdge = width;
    for (let x = leftMargin + 50; x < width; x++) {
        let columnHasContent = false;
        for (let y = topMargin; y < Math.min(height, topMargin + 150); y++) {
            if (getAlpha(x, y) > 10) {
                columnHasContent = true;
                break;
            }
        }
        if (!columnHasContent) {
            rightEdge = x;
            break;
        }
    }

    // Find bottom edge of the main sprite (look for transparent row gap after content)
    let bottomEdge = height;
    for (let y = topMargin + 50; y < height; y++) {
        let rowHasContent = false;
        for (let x = leftMargin; x < rightEdge; x++) {
            if (getAlpha(x, y) > 10) {
                rowHasContent = true;
                break;
            }
        }
        if (!rowHasContent) {
            bottomEdge = y;
            break;
        }
    }

    // Now find exact bounds of the sprite within this region
    let minX = rightEdge, minY = bottomEdge, maxX = leftMargin, maxY = topMargin;
    for (let y = topMargin; y < bottomEdge; y++) {
        for (let x = leftMargin; x < rightEdge; x++) {
            if (getAlpha(x, y) > 10) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < minX || maxY < minY) {
        return null;
    }

    const spriteWidth = maxX - minX + 1;
    const spriteHeight = maxY - minY + 1;

    return {
        minX, minY, maxX, maxY,
        spriteWidth, spriteHeight,
        leftMargin: minX,
        topMargin: minY
    };
}

async function cropAndReplace(filePath) {
    // Read entire file into buffer first (prevents corruption)
    const inputBuffer = fs.readFileSync(filePath);

    const bounds = await findSpriteBounds(inputBuffer);

    if (!bounds) {
        throw new Error('No sprite content found');
    }

    // Extract just the sprite
    const spriteBuffer = await sharp(inputBuffer)
        .extract({
            left: bounds.minX,
            top: bounds.minY,
            width: bounds.spriteWidth,
            height: bounds.spriteHeight
        })
        .toBuffer();

    // Output size: sprite + same margin on both sides
    const outputWidth = bounds.spriteWidth + bounds.leftMargin * 2;
    const outputHeight = bounds.spriteHeight + bounds.topMargin * 2;

    // Create final image in memory
    const outputBuffer = await sharp({
        create: {
            width: outputWidth,
            height: outputHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite([{
            input: spriteBuffer,
            left: bounds.leftMargin,
            top: bounds.topMargin
        }])
        .png()
        .toBuffer();

    // Write back to the same file
    fs.writeFileSync(filePath, outputBuffer);

    return { outputWidth, outputHeight, spriteWidth: bounds.spriteWidth, spriteHeight: bounds.spriteHeight };
}

async function cropSprites(elements) {
    console.log('\n=== STEP 3: Cropping sprites in data/element_images ===');

    // Build list of _0 texture names (only crop the _0 versions)
    const textureNames = new Set();
    elements.forEach(element => {
        const textureName = element.substance?.anim?.textureList?.[0]?.name;
        if (textureName) {
            textureNames.add(textureName);
        }
    });

    let processed = 0;
    let skipped = 0;

    for (const textureName of textureNames) {
        const filePath = path.join(outputImagesFolder, `${textureName}.png`);

        if (!fs.existsSync(filePath)) {
            console.warn(`Image not found: ${textureName}.png`);
            skipped++;
            continue;
        }

        try {
            const result = await cropAndReplace(filePath);
            console.log(`Cropped: ${textureName}.png (${result.spriteWidth}x${result.spriteHeight} -> ${result.outputWidth}x${result.outputHeight})`);
            processed++;
        } catch (error) {
            console.error(`Failed to process ${textureName}.png:`, error.message);
            skipped++;
        }
    }

    console.log(`\nCropped: ${processed}, Skipped: ${skipped}`);
}

// ============================================================
// Helper: Load elements from minimal file (for steps 2,3 when step 1 is skipped)
// ============================================================
function loadElements() {
    if (!fs.existsSync(elementsMinimalPath)) {
        console.error(`elements_minimal.json not found. Run step 1 first.`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(elementsMinimalPath, 'utf8'));
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    try {
        let elements = null;

        // Step 1: Extract elements
        if (stepsToRun.includes(1)) {
            elements = extractElements();
        }

        // Step 2: Copy valid textures
        if (stepsToRun.includes(2)) {
            if (!elements) elements = loadElements();
            await copyValidTextures(elements);
        }

        // Step 3: Crop sprites in-place
        if (stepsToRun.includes(3)) {
            if (!elements) elements = loadElements();
            await cropSprites(elements);
        }

        console.log('\n=== ALL DONE ===');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
