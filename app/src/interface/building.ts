import type { FederatedPointerEvent, Sprite } from 'pixi.js';

// Placement state interface
export interface PlacementState {
    sprite: Sprite | null;
    mouseMoveHandler?: ((event: FederatedPointerEvent) => void) | null;
    clickHandler?: ((event: FederatedPointerEvent) => void) | null;
}

export interface DragDrawHandlers {
    startDrag: (event: FederatedPointerEvent) => void;
    moveDrag: (event: FederatedPointerEvent) => void;
    endDrag: () => void;
}

export interface NodeData {
    connects: string[];
    metadata: NodeMetadata;
}

export interface NodeMetadata {
    name?: string;
    displayName?: string;
    sprite?: Sprite;
}
