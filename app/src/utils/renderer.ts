import * as PIXI from "pixi.js";
import { CELL_SIZE } from "src/lib/constant";
import type { Camera } from "src/utils/camera";

export class Renderer {
    private container: PIXI.Container;
    private camera: Camera;
    private gridGraphics: PIXI.Graphics;
    private screenWidth: number;
    private screenHeight: number;

    constructor(container: PIXI.Container, camera: Camera, screenWidth: number, screenHeight: number) {
        this.container = container;
        this.camera = camera;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;

        this.gridGraphics = new PIXI.Graphics();
        this.container.addChild(this.gridGraphics);
    }

    updateScreenSize(width: number, height: number): void {
        this.screenWidth = width;
        this.screenHeight = height;
        this.draw();
    }

    draw(): void {
        this.gridGraphics.clear();

        const zoom = this.camera.zoom;
        const { x: camX, y: camY } = this.camera.position;

        // Calculate visible world bounds
        const worldLeft = -camX / zoom;
        const worldTop = -camY / zoom;
        const worldRight = (this.screenWidth - camX) / zoom;
        const worldBottom = (this.screenHeight - camY) / zoom;

        // Calculate grid bounds with padding
        const padding = CELL_SIZE * 2;
        const startCol = Math.floor((worldLeft - padding) / CELL_SIZE);
        const endCol = Math.ceil((worldRight + padding) / CELL_SIZE);
        const startRow = Math.floor((worldTop - padding) / CELL_SIZE);
        const endRow = Math.ceil((worldBottom + padding) / CELL_SIZE);

        // this.gridGraphics.lineStyle(1, 0x404040, 0.5);

        // Draw vertical lines
        for (let col = startCol; col <= endCol; col++) {
            const x = col * CELL_SIZE;
            this.gridGraphics.moveTo(x, startRow * CELL_SIZE);
            this.gridGraphics.lineTo(x, endRow * CELL_SIZE);
            this.gridGraphics.stroke({ width: 1 / zoom, color: 0x888888, alpha: 0.5 });
        }

        // Draw horizontal lines
        for (let row = startRow; row <= endRow; row++) {
            const y = row * CELL_SIZE;
            this.gridGraphics.moveTo(startCol * CELL_SIZE, y);
            this.gridGraphics.lineTo(endCol * CELL_SIZE, y);
            this.gridGraphics.stroke({ width: 1 / zoom, color: 0x888888, alpha: 0.5 });
        }
    }

    getCellFromScreenPos(screenX: number, screenY: number): { row: number; col: number } {
        const world = this.camera.screenToWorld(screenX, screenY);
        return {
            col: Math.floor(world.x / CELL_SIZE),
            row: Math.floor(world.y / CELL_SIZE),
        };
    }

    destroy(): void {
        this.gridGraphics.destroy();
    }
}
