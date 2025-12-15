const fs = require('fs');
const path = require('path');

// Paths
const buildingUvDir = path.join(__dirname, '..', 'building_uv');
const uiImageDir = path.join(__dirname, '..', 'ui_images');
const buildingJsonPath = path.join(__dirname, '..', 'database_base', 'building_2025.json');

// Helper to extract texture name from BlockTileAtlas object
function extractBlockTileAtlasName(atlas) {
    if (atlas && atlas.texture && atlas.texture.name) {
        return atlas.texture.name;
    }
    return null;
}

// Read the building JSON and extract texture names for building_uv
function getUsedUvTextureNames() {
    const jsonData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));
    const textureNames = new Set();

    if (jsonData.buildingDefs && Array.isArray(jsonData.buildingDefs)) {
        for (const building of jsonData.buildingDefs) {
            // Skip deprecated buildings - their textures should be removed
            if (building.Deprecated === true) {
                continue;
            }

            // Add TextureName
            if (building.TextureName) {
                textureNames.add(`${building.TextureName}.png`);
            }

            // Add BlockTileAtlas.texture.name
            const blockTileAtlasName = extractBlockTileAtlasName(building.BlockTileAtlas);
            if (blockTileAtlasName) {
                textureNames.add(`${blockTileAtlasName}.png`);
            }

            // Add BlockTilePlaceAtlas.texture.name
            const blockTilePlaceAtlasName = extractBlockTileAtlasName(building.BlockTilePlaceAtlas);
            if (blockTilePlaceAtlasName) {
                textureNames.add(`${blockTilePlaceAtlasName}.png`);
            }

            // Add BlockTileShineAtlas.texture.name
            const blockTileShineAtlasName = extractBlockTileAtlasName(building.BlockTileShineAtlas);
            if (blockTileShineAtlasName) {
                textureNames.add(`${blockTileShineAtlasName}.png`);
            }
        }
    }

    return textureNames;
}

// Read the building JSON and extract PrefabID for ui_images
function getUsedUiImageNames() {
    const jsonData = JSON.parse(fs.readFileSync(buildingJsonPath, 'utf8'));
    const imageNames = new Set();

    if (jsonData.buildingDefs && Array.isArray(jsonData.buildingDefs)) {
        for (const building of jsonData.buildingDefs) {
            // Skip deprecated buildings - their images should be removed
            if (building.Deprecated === true) {
                continue;
            }

            // Add PrefabID as the UI image name
            if (building.PrefabID) {
                imageNames.add(`${building.PrefabID}.png`);
            }
        }
    }

    return imageNames;
}

// Get all files in a directory
function getFilesInDir(dir) {
    return fs.readdirSync(dir).filter((file) => {
        const fullPath = path.join(dir, file);
        return fs.statSync(fullPath).isFile();
    });
}

// Main cleanup function
function cleanUnusedImages(targetDir, getUsedNames, dirLabel, dryRun = true) {
    const usedImages = getUsedNames();
    const allFiles = getFilesInDir(targetDir);

    console.log(`Total files in ${dirLabel}: ${allFiles.length}`);
    console.log(`Images referenced in building_2025.json: ${usedImages.size}\n`);

    const unusedFiles = allFiles.filter((file) => !usedImages.has(file));
    const usedFiles = allFiles.filter((file) => usedImages.has(file));

    console.log(`Files in use: ${usedFiles.length}`);
    console.log(`Unused files to remove: ${unusedFiles.length}\n`);

    if (unusedFiles.length === 0) {
        console.log('No unused files found. Nothing to clean up.\n');
        return { deleted: 0, errors: 0 };
    }

    if (dryRun) {
        return { deleted: 0, errors: 0, wouldDelete: unusedFiles.length };
    } else {
        console.log('=== EXECUTING DELETION ===\n');
        let deletedCount = 0;
        let errorCount = 0;

        for (const file of unusedFiles) {
            const filePath = path.join(targetDir, file);
            try {
                fs.unlinkSync(filePath);
                deletedCount++;
            } catch (err) {
                console.error(`  Error deleting ${file}: ${err.message}`);
                errorCount++;
            }
        }

        console.log(`\nSuccessfully deleted: ${deletedCount} files`);
        if (errorCount > 0) {
            console.log(`Errors: ${errorCount} files`);
        }
        console.log('');
        return { deleted: deletedCount, errors: errorCount };
    }
}

// Print usage
function printUsage() {
    console.log('Usage: node cleanUnusedImages.js [options] [target]');
    console.log('');
    console.log('Targets:');
    console.log('  --uv       Clean building_uv directory (default)');
    console.log('  --ui       Clean ui_images directory');
    console.log('  --all      Clean both directories');
    console.log('');
    console.log('Options:');
    console.log('  --execute, -e    Actually delete files (default is dry run)');
    console.log('  --help, -h       Show this help message');
    console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
}

const executeMode = args.includes('--execute') || args.includes('-e');
const cleanUv =
    args.includes('--uv') ||
    args.includes('--all') ||
    (!args.includes('--ui') && !args.includes('--all'));
const cleanUi = args.includes('--ui') || args.includes('--all');

console.log('=== Image Cleanup Script ===\n');

if (!executeMode) {
    console.log('Running in DRY RUN mode. Use --execute to actually delete files.\n');
}

if (cleanUv) {
    cleanUnusedImages(buildingUvDir, getUsedUvTextureNames, 'building_uv', !executeMode);
}

if (cleanUi) {
    cleanUnusedImages(uiImageDir, getUsedUiImageNames, 'ui_images', !executeMode);
}
