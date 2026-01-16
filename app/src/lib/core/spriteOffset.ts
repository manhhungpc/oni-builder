import type { Position } from 'src/interface/building';

// Map of building sprite offsets (visual only, doesn't affect collision)
// Key: building name, Value: { x: grid offset right, y: grid offset down }
const spriteOffsets = new Map<string, Position>([
	['SteamTurbine2', { x: 0, y: 0.5 }],
	['LiquidPumpingStation', { x: 0, y: 2 }],
	['RationBox', { x: 0, y: 0.25 }],
	['OxyliteRefinery', { x: 0, y: 0.3 }],
	['ArcadeMachine', { x: 0, y: 0.25 }],
]);

function setSpriteOffset(buildingName: string, x: number, y: number): void {
	spriteOffsets.set(buildingName, { x, y });
}

function getSpriteOffset(buildingName: string): Position {
	return spriteOffsets.get(buildingName) ?? { x: 0, y: 0 };
}

function clearSpriteOffset(buildingName: string): void {
	spriteOffsets.delete(buildingName);
}

export { setSpriteOffset, getSpriteOffset, clearSpriteOffset, spriteOffsets };
