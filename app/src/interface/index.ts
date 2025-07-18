import type { Application, Container, Renderer } from 'pixi.js';
import { MODE, OVERLAY } from '@shared/src/enum';
import type { Camera } from 'src/utils/camera';
import type { IBuilding, Position } from '@shared/src/interface';

export interface GlobalState {
    pixiApp: null | Application<Renderer>;
    currentMode: MODE;
    selectedBuilding: null | IBuilding;
    initWindowWidth: number;
    initWindowHeight: number;
    currentOverlays: {
        value: OVERLAY;
        text: string;
        icon?: string;
        [key: string]: any;
    };
    camera: null | Camera;
    buildContainer: null | Container;
    isValidPlacement: boolean;
}

export interface DropdownItem {
    text: string;
    value: any;
    icon?: string;
    iconPath?: string;
    disabled?: boolean;
    [key: string]: any;
}

export interface AssetConfig {
    alias: string;
    src: string;
}

export interface PlacedBuildings {
    display_name: string;
    top_left: Position;
    bottom_right: Position;
    scene_layer: number;
    object_layer: number;
    tile_layer: number;
    category: string; // For display overlays
}

export interface BuildingBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface AppMessage {
    text: string;
    popup: string;
}
