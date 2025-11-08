import type { Application, Container, Renderer } from 'pixi.js';
import { OVERLAY } from 'src/lib/constant';
import type { Camera } from '$lib/rendering/camera';
import type { IBuilding, Position } from 'src/interface/building';
import type { ACTION } from 'src/lib/constant';

export interface GlobalState {
	pixiApp: null | Application<Renderer>;
	currentAction: ACTION;
	selectedBuilding: null | IBuilding;
	initWindowWidth: number;
	initWindowHeight: number;
	currentOverlays: OVERLAY;
	camera: null | Camera;
	buildContainer: null | Container;
	isValidPlacement: boolean;
}

export interface AppConfig {
	panSpeed: number;
	zoomLevel: number;
	selectedAction: ACTION;
	selectedOverlay: OVERLAY;
	selectedToBuild: null | IBuilding;
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
	view_mode: number;
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
