import type { IElement } from 'src/interface/element';
import type { Graphics, Ticker } from 'pixi.js';

export interface FlowSimulationState {
	isSimulationMode: boolean;
	selectedElement: IElement | null;
	filledPipes: Set<string>;
	fillMode: 'manual' | 'auto';
	pipeDirections: Map<string, string[]>;
	isRunning: boolean;
}

export interface FlowRenderState {
	filledPipeGraphics: Map<string, Graphics>;
	directionArrowGraphics: Map<string, Graphics>;
	tickerCallback: ((ticker: Ticker) => void) | null;
}

export interface PacketState {
	from: string;
	to?: string;
}