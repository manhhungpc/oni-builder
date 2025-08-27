import { type Compressed } from 'compress-json';

export interface CompressedCanvasData {
    buildings: Compressed;
    timestamp: number;
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

export interface SimplifiedNode {
    c: string[];
    m?: {
        n?: string;
        d?: string;
    };
}

export interface SimplifiedBuilding {
    d: string;
    tl: [number, number];
    br: [number, number];
    sl: number;
    ol: number;
    tl2: number;
    vm: number;
    c: string;
}
