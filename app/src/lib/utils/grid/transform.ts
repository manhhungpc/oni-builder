import { CELL_SIZE } from '$lib/constant';

export function worldToGrid(worldPos: { x: number; y: number }): { gridX: number; gridY: number } {
    return {
        gridX: Math.floor(worldPos.x / CELL_SIZE),
        gridY: Math.floor(worldPos.y / CELL_SIZE),
    };
}

export function gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
        x: gridX * CELL_SIZE,
        y: gridY * CELL_SIZE,
    };
}

export function gridToCellCenter(position: string): { x: number; y: number } {
    const [x, y] = position.split(',').map(Number);
    return {
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
    };
}