const fs = require('fs');
const path = require('path');

// Paths
const buildingUvDir = path.join(__dirname, '..', 'building_uv');
const buildingJsonPath = path.join(__dirname, '..', 'database_base', 'building_2025.json');

// Helper to extract texture name from BlockTileAtlas object
function extractBlockTileAtlasName(atlas) {
  if (atlas && atlas.texture && atlas.texture.name) {
    return atlas.texture.name;
  }
  return null;
}

// Read the building JSON and extract all TextureName and BlockTileAtlas.texture.name values
function getUsedTextureNames() {
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

// Get all files in building_uv directory
function getBuildingUvFiles() {
  return fs.readdirSync(buildingUvDir).filter(file => {
    const fullPath = path.join(buildingUvDir, file);
    return fs.statSync(fullPath).isFile();
  });
}

// Main cleanup function
function cleanUnusedBuildingUV(dryRun = true) {
  console.log('=== Building UV Cleanup Script ===\n');

  const usedTextures = getUsedTextureNames();
  const allFiles = getBuildingUvFiles();

  console.log(`Total files in building_uv: ${allFiles.length}`);
  console.log(`Textures referenced in building_2025.json: ${usedTextures.size}\n`);

  const unusedFiles = allFiles.filter(file => !usedTextures.has(file));
  const usedFiles = allFiles.filter(file => usedTextures.has(file));

  console.log(`Files in use: ${usedFiles.length}`);
  console.log(`Unused files to remove: ${unusedFiles.length}\n`);

  if (unusedFiles.length === 0) {
    console.log('No unused files found. Nothing to clean up.');
    return;
  }

  if (dryRun) {
    console.log('=== DRY RUN MODE ===');
    console.log('The following files would be removed:\n');
    unusedFiles.forEach(file => console.log(`  - ${file}`));
    console.log('\nRun with --execute flag to actually delete these files.');
  } else {
    console.log('=== EXECUTING DELETION ===\n');
    let deletedCount = 0;
    let errorCount = 0;

    for (const file of unusedFiles) {
      const filePath = path.join(buildingUvDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`  Deleted: ${file}`);
        deletedCount++;
      } catch (err) {
        console.error(`  Error deleting ${file}: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Successfully deleted: ${deletedCount} files`);
    if (errorCount > 0) {
      console.log(`Errors: ${errorCount} files`);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const executeMode = args.includes('--execute') || args.includes('-e');

cleanUnusedBuildingUV(!executeMode);
