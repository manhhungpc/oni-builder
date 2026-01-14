import type { Container, FederatedPointerEvent, Sprite } from 'pixi.js';
import { BUILD_RULE, OVERLAY, PORT } from '$lib/constant';

// Building related interfaces
export interface Material {
    name: string;
    amount: number;
}

export interface Position {
    x: number;
    y: number;
}

export interface Conduit {
    input_type?: number | null;
    input_offset?: Position | null;
    output_type?: number | null;
    output_offset?: Position | null;
}

export interface LogicPort {
    type: string;
    offset: {
        x: number;
        y: number;
    };
}

export interface PowerPort {
    type: string;
    consume_amount?: number | null;
    generate_amount?: number | null;
    input_offset?: Position | null;
    output_offset?: Position | null;
}

export interface IBuilding {
    id: string;
    name: string;
    display_name: string;
    display_image: string;
    texture_name: string;
    special_texture: string[];
    width: number;
    height: number;
    placement_offset: Position[];
    scene_layer: number;
    object_layer: number;
    tile_layer: number;
    search_term: string[];
    is_drag_build: boolean;
    is_need_foundation: boolean;
    is_foundation: boolean;
    conduit?: Conduit | null;
    logic_port?: LogicPort[] | null;
    power_port?: PowerPort | null;
    materials: Material[];
    category?: string | null;
    type?: string | null;
    view_mode?: number;
    build_rule: BUILD_RULE;
    rotation_permit: number;
}

// Placement state interface
export interface PlacementState {
    sprite: Sprite | null;
    previewContainer?: Container | null;
    mouseMoveHandler?: ((event: FederatedPointerEvent) => void) | null;
    clickHandler?: ((event: FederatedPointerEvent) => void) | null;
    updateOrientation?: (newOrientation: number) => void;
}

export interface PreviewState {
    previewContainer: Container;
    mouseMoveHandler?: ((event: FederatedPointerEvent) => void) | null;
    updateOrientation?: (newOrientation: number) => void;
}

export interface DragDrawHandlers {
    startDrag: (event: FederatedPointerEvent) => void;
    moveDrag: (event: FederatedPointerEvent) => void;
    endDrag: () => void;
}

export interface ConduitNode {
    connects: string[];
    metadata: GridNodeData;
}

export interface GridNodeData {
    name?: string;
    displayName?: string;
    sprite?: Sprite;
}

export interface OverlayInfo {
    name: string;
    ports: Map<string, PORT>;
    setPort: (key: string, portType: PORT) => void;
}

export interface PortOverlapDetail {
    hasOverlap: boolean;
    overlaps: Array<{
        existPortType: PORT;
        category: OVERLAY;
    }>;
}
