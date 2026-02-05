import type { Container } from 'pixi.js';

export interface IElement {
	id: string;
	name: string;
	texture: string;
	type: 'liquid' | 'gas' | 'solid' | 'vacuum';
	colour: string | null; // "r,g,b,a" format
	uiColour: string | null;
	conduitColour: string | null;
}

export interface PlacedElement {
	elementId: string;
	name: string;
	type: string;
	colour: string | null;
	container?: Container;
}
