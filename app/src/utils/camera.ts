import * as PIXI from 'pixi.js';

export interface CameraState {
    x: number;
    y: number;
    zoom: number;
}

export class Camera {
    private container: PIXI.Container;
    private state: CameraState = { x: 0, y: 0, zoom: 1.5 };

    readonly MIN_ZOOM = 0.5;
    readonly MAX_ZOOM = 2.5;
    readonly ZOOM_STEP = 0.1;

    constructor(container: PIXI.Container) {
        this.container = container;
        this.updateTransform();
    }

    get position() {
        return { x: this.state.x, y: this.state.y };
    }
    get zoom() {
        return this.state.zoom;
    }

    pan(deltaX: number, deltaY: number): void {
        this.state.x += deltaX;
        this.state.y += deltaY;
        this.updateTransform();
    }

    zoomAt(mouseX: number, mouseY: number, scaleFactor: number): void {
        const newZoom = Math.max(
            this.MIN_ZOOM,
            Math.min(this.MAX_ZOOM, this.state.zoom * scaleFactor)
        );

        if (newZoom === this.state.zoom) return;

        // Convert mouse position to world coordinates before zoom
        const worldX = (mouseX - this.state.x) / this.state.zoom;
        const worldY = (mouseY - this.state.y) / this.state.zoom;

        this.state.zoom = newZoom;

        // Adjust position to keep the same world point under the mouse
        this.state.x = mouseX - worldX * this.state.zoom;
        this.state.y = mouseY - worldY * this.state.zoom;

        this.updateTransform();
    }

    worldToScreen(x: number, y: number): { x: number; y: number } {
        return {
            x: x * this.state.zoom + this.state.x,
            y: y * this.state.zoom + this.state.y,
        };
    }

    screenToWorld(x: number, y: number): { x: number; y: number } {
        return {
            x: (x - this.state.x) / this.state.zoom,
            y: (y - this.state.y) / this.state.zoom,
        };
    }

    private updateTransform(): void {
        this.container.position.set(this.state.x, this.state.y);
        this.container.scale.set(this.state.zoom);
    }
}
