const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TEXTURE_DIRECTION = [
    'L',
    'R',
    'U',
    'D',
    'LR',
    'LU',
    'LD',
    'RU',
    'RD',
    'UD',
    'LRU',
    'LRD',
    'LUD',
    'RUD',
    'LRUD',
];

async function extractSpriteSheet(textureName, uvSpriteData) {
    const projectRoot = path.join(__dirname, '../../../..');
    const uvImagePath = path.join(projectRoot, 'data/uv_image');
    const outputPath = path.join(projectRoot, 'data/extract_uv');

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    const sprites = uvSpriteData.uiSprites;
    const spriteModifiers = uvSpriteData.spriteModifiers || [];

    const matchingSprites = sprites.filter(
        (sprite) => sprite.textureName === `${textureName}_solid`
    );

    if (matchingSprites.length === 0) {
        console.log(`No sprites found for texture: ${textureName}`);
        return [];
    }

    let textures = [];
    let textureFilePath = path.join(uvImagePath, `${textureName}_solid.png`);

    // Try different texture file name patterns
    if (!fs.existsSync(textureFilePath)) {
        textureFilePath = path.join(uvImagePath, `${textureName}.png`);
    }

    // Check if texture file exists
    if (!fs.existsSync(textureFilePath)) {
        console.log(`Texture file not found: ${textureName}`);
        return [];
    }

    // Extract each sprite from the texture
    for (const sprite of matchingSprites) {
        try {
            const items = await modifierSprite(
                sprite,
                spriteModifiers,
                textureFilePath,
                outputPath
            );
            textures.push(...items);
        } catch (error) {
            console.error(`Error extracting ${sprite.name}: ${error.message}`);
        }
    }

    console.log('Sprite extraction completed!');
    return textures;
}

function getSpriteInfo(buildingIdName, uiSpriteInfo) {
    const sprites = uiSpriteInfo.uiSpriteInfos;

    return sprites[buildingIdName] ?? {};
}

async function modifierSprite(sprite, spriteModifiers, textureFilePath, outputPath) {
    const textures = [];

    // Find all matching modifiers for this sprite
    const matchingModifiers = spriteModifiers.filter(
        (modifier) => modifier.spriteInfoName === sprite.name
    );

    for (const matchModifier of matchingModifiers) {
        // Check if modifier name ends with any TEXTURE_DIRECTION or _None
        const endsWithDirection = TEXTURE_DIRECTION.some((direction) =>
            matchModifier.name.endsWith(`_${direction}`)
        );
        const endsWithNone = matchModifier.name.endsWith('_None');

        if (!endsWithDirection && !endsWithNone) {
            continue;
        }

        const outputFilePath = path.join(outputPath, `${matchModifier.name}.png`);
        textures.push(process.env.IMAGE_PATH + matchModifier.name + '.png');

        if (fs.existsSync(outputFilePath)) {
            console.log(`File exists, skip: ${matchModifier.name}.png`);
            continue;
        }

        const image = await sharpImage(textureFilePath, sprite, matchModifier);
        await image.toFile(outputFilePath);

        console.log(`Extracted: ${matchModifier.name}.png (from sprite: ${sprite.name})`);
    }

    console.log('🐧 ~ modifierSprite ~ textures:', textures);
    return textures;
}

async function sharpImage(textureFilePath, sprite, matchModifier) {
    let image = sharp(textureFilePath).extract({
        left: sprite.uvMin.x,
        top: sprite.uvMin.y,
        width: sprite.uvSize.x,
        height: sprite.uvSize.y,
    });

    if (matchModifier.scale) {
        if (matchModifier.scale.y < 0) {
            image = image.flip();
        }

        // Apply scaling
        // const scaleX = Math.abs(matchModifier.scale.x || 1);
        // const scaleY = Math.abs(matchModifier.scale.y || 1);

        // if (scaleX !== 1 || scaleY !== 1) {
        //     const newWidth = Math.round(sprite.uvSize.x * scaleX);
        //     const newHeight = Math.round(sprite.uvSize.y * scaleY);
        //     image = image.resize(newWidth, newHeight);
        // }
    }

    // Apply rotation (clockwise)
    if (matchModifier.rotation && matchModifier.rotation !== 0) {
        image = image.rotate(-matchModifier.rotation);
    }

    return image;
}

module.exports = { extractSpriteSheet, getSpriteInfo };
