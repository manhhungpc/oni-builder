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
        textures.push(process.env.EXTRACT_UV_IMAGE_PATH + matchModifier.name + '.png');

        if (fs.existsSync(outputFilePath)) {
            console.log(`File exists, skip: ${matchModifier.name}.png`);
            continue;
        }

        const image = await sharpImage(textureFilePath, sprite, matchModifier);
        await image.toFile(outputFilePath);

        console.log(`Extracted: ${matchModifier.name}.png (from sprite: ${sprite.name})`);
    }

    return textures;
}

async function sharpImage(textureFilePath, sprite, matchModifier) {
    let itemImage = sharp(textureFilePath).extract({
        left: sprite.uvMin.x,
        top: sprite.uvMin.y,
        width: sprite.uvSize.x,
        height: sprite.uvSize.y,
    });

    const itemBuffer = await itemImage.toBuffer({ resolveWithObject: true });
    const itemWidth = itemBuffer.info.width;
    const itemHeight = itemBuffer.info.height;

    // Trim 8 pixels from each edge of the extracted sprite
    const trimAmount = 8;
    const trimmedWidth = itemWidth - 2 * trimAmount;
    const trimmedHeight = itemHeight - 2 * trimAmount;

    if (trimmedWidth > 0 && trimmedHeight > 0) {
        itemImage = sharp(itemBuffer.data).extract({
            left: trimAmount,
            top: trimAmount,
            width: trimmedWidth,
            height: trimmedHeight,
        });
    }

    // Create square sprite based on pivot point BEFORE any transformations
    if (sprite.pivot && sprite.pivot.x !== undefined && sprite.pivot.y !== undefined) {
        const trimmedBuffer = await itemImage.toBuffer({ resolveWithObject: true });
        const trimmedSpriteWidth = trimmedBuffer.info.width;
        const trimmedSpriteHeight = trimmedBuffer.info.height;

        // Calculate anchor point position in the trimmed sprite
        // Note: pivot is from bottom-left, but Sharp uses top-left coordinates
        // So we need to convert: anchorY = height - (pivot.y * height)
        const anchorX = Math.round(sprite.pivot.x * trimmedSpriteWidth);
        const anchorY = Math.round(trimmedSpriteHeight - sprite.pivot.y * trimmedSpriteHeight);

        // Calculate distances from anchor point to each side of the sprite
        const distanceToLeft = anchorX;
        const distanceToRight = trimmedSpriteWidth - anchorX;
        const distanceToTop = anchorY;
        const distanceToBottom = trimmedSpriteHeight - anchorY;

        // Square size = 2 * max distance from anchor to any side
        const maxDistance = Math.max(
            distanceToLeft,
            distanceToRight,
            distanceToTop,
            distanceToBottom
        );
        const squareSize = maxDistance * 2;

        // Calculate padding needed to center the sprite with anchor at square center
        const centerX = Math.floor(squareSize / 2);
        const centerY = Math.floor(squareSize / 2);

        // Calculate padding for each side
        const padLeft = Math.max(0, centerX - anchorX);
        const padRight = Math.max(0, squareSize - trimmedSpriteWidth - padLeft);
        const padTop = Math.max(0, centerY - anchorY);
        const padBottom = Math.max(0, squareSize - trimmedSpriteHeight - padTop);

        // Use extend to add padding around the sprite
        itemImage = itemImage.extend({
            top: Math.round(padTop),
            bottom: Math.round(padBottom),
            left: Math.round(padLeft),
            right: Math.round(padRight),
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        });

        const squareBuffer = await itemImage.toBuffer();
        itemImage = sharp(squareBuffer);
    }

    if (matchModifier.scale) {
        if (matchModifier.scale.y < 0) {
            itemImage = itemImage.flip();
        }
    }

    if (matchModifier.rotation && matchModifier.rotation !== 0) {
        itemImage = itemImage.rotate(-matchModifier.rotation);
    }

    return itemImage;
}

module.exports = { extractSpriteSheet, getSpriteInfo };
