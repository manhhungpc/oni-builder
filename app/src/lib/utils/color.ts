/**
 * Parse backend RGBA color string (e.g. "134,255,164,255") to a hex number for PIXI.
 * Returns fallback color if input is null or malformed.
 */
export function rgbaToHex(rgba: string | null, fallback: number = 0x808080): number {
	if (!rgba) return fallback;

	const parts = rgba.split(',').map(Number);
	if (parts.length < 3) return fallback;

	const r = Math.round(parts[0]) & 0xff;
	const g = Math.round(parts[1]) & 0xff;
	const b = Math.round(parts[2]) & 0xff;

	return (r << 16) | (g << 8) | b;
}

/**
 * Parse backend RGBA color string (e.g. "134,255,164,255") to a CSS rgb() string.
 * Returns fallback if input is null or malformed.
 */
export function rgbaToCss(rgba: string | null, fallback: string = 'rgb(128, 128, 128)'): string {
	if (!rgba) return fallback;

	const parts = rgba.split(',').map(Number);
	if (parts.length < 3) return fallback;

	return `rgb(${Math.round(parts[0])}, ${Math.round(parts[1])}, ${Math.round(parts[2])})`;
}
