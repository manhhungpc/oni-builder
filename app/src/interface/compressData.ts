import { type Compressed } from 'compress-json';
import type { ConduitNode, GridNodeData } from 'src/interface/building';

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

export interface SavedConnections {
	liquidPipes?: Map<string, ConduitNode>;
	gasPipes?: Map<string, ConduitNode>;
	wires?: Map<string, ConduitNode>;
	logicWires?: Map<string, ConduitNode>;
	conveyor?: Map<string, ConduitNode>;
	tiles?: Map<string, GridNodeData>;
}
