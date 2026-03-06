import type { Container } from 'pixi.js';

export interface IElement {
	id: string;
	idx: number;
	name: string;
	texture: string;
	type: 'liquid' | 'gas' | 'solid' | 'vacuum';
	colour: string | null; // "r,g,b,a" format
	uiColour: string | null;
	conduitColour: string | null;
	specificHeatCapacity: number;
	thermalConductivity: number;
}

export interface ElementWithThermal extends IElement {
	mass: number; // kg
	temperature: number;
}

export interface PlacedElement {
	elementId: string;
	name: string;
	type: string;
	colour: string | null;
	container?: Container;
}
