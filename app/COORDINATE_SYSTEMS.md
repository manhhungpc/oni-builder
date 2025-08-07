# Coordinate Systems Documentation

## Overview

This project uses three coordinate systems:

1. **Grid Coordinates** - Integer tile positions (e.g., x: 5, y: 3)
2. **World Coordinates** - Pixel positions in the game world (grid x 40)
3. **Screen Coordinates** - Pixel positions on the user's screen (world x zoom + pan)

## Formulas

```
World Position = Grid Position x CELL_SIZE
Screen Position = World Position x Zoom + Camera Pan
```

---

## Detailed explanation

### 1. Grid coordinates

Grid coordinates represent the tile-based positions in the game world. These are always integers.

-   **Usage**: Building placement, collision detection, game logic
-   **Example**: A building at grid position (5, 3) occupies the 5th column and 3rd row
-   **Stored in**: `placedBuildings` array stores grid positions

### 2. World coordinates

World coordinates represent the actual pixel positions in the game world. Using this to calculate sprites, lines position that need to be drawn on canvas

-   **Formula**: `worldPosition = gridPosition × CELL_SIZE`
-   **CELL_SIZE**: 40 pixels (defined in `/app/src/lib/constant.ts`)
-   **Usage**: Sprite positioning, rendering
-   **Example**: Grid (5, 3) → World (200, 120)

```typescript
// Converting grid to world for sprite positioning
sprite.position.set(gridX * CELL_SIZE, gridY * CELL_SIZE);
```

### 3. Screen coordinates

Screen coordinates are what the user sees on their monitor after camera transformations.

-   **Affected by**: Camera pan (x, y) and zoom level
-   **Usage**: Mouse input, click detection
-   **Conversion**: Handled by camera.ts

```typescript
// Camera transformations
screenToWorld(x, y) = {
    x: (x - camera.x) / camera.zoom,
    y: (y - camera.y) / camera.zoom,
};

worldToScreen(x, y) = {
    x: x * camera.zoom + camera.x,
    y: y * camera.zoom + camera.y,
};
```

## Coordinate flow

### User interact flow (click to place building)

```
1. Mouse Click (Screen: 400, 300)
    ↓ camera.screenToWorld()
2. World Position (200, 120)
    ↓ Math.floor(world / CELL_SIZE)
3. Grid Position (5, 3)
    ↓ Store in placedBuildings
4. Saved as Grid Coordinates
```

### Rendering flow (or drawing buildings)

```
1. Grid Position from placedBuildings (5, 3)
    ↓ grid × CELL_SIZE
2. World Position (200, 120)
    ↓ Apply to sprite.position
3. Sprite positioned in world
    ↓ Camera transformation
4. Displayed on screen
```

## Important notes

1. **Y-Axis Direction**:

    - Pixi.js uses Y-down (increases downward)
    - Game data (in building.json) uses Y-up (increases upward)
    - This is handled in `calculateBuildingOffset()`

2. **Building Offsets**:

    - Buildings can have `placement_offset` arrays
    - These define which tiles the building occupies
    - Offsets are in grid coordinates

3. **Coordinate System Consistency**:
    - Always store positions as grid coordinates in data
    - Convert to world coordinates only for rendering
    - Use camera transformations for screen interaction

## Common mistakes

1. **Mixing Coordinate Systems**: Don't store world positions when grid positions are expected
2. **Forgetting CELL_SIZE**: Remember to multiply by CELL_SIZE when converting grid to world
3. **Camera Transformations**: Always use camera methods for screen <-> world conversions
4. **Y-Axis Confusion**: Remember the Y-axis flip between game data and Pixi.js
