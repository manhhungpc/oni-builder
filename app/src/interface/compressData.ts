import { type Compressed } from 'compress-json';

export interface CompressedCanvasData {
	buildings: Compressed;
	timestamp?: number;
}

export interface CompressedConnections {
	liquidPipes?: Compressed | null;
	gasPipes?: Compressed | null;
	wires?: Compressed | null;
	logicWires?: Compressed | null;
	tiles?: Compressed | null;
	conveyor?: Compressed | null;
	other?: Compressed | null;
}
