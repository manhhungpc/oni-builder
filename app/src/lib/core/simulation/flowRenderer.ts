import * as PIXI from 'pixi.js';
import type { Container } from 'pixi.js';
import type { IElement } from 'src/interface/element';
import type { FlowRenderState, PacketState } from 'src/interface/pipeFlow';
import { CELL_SIZE } from '$lib/constant';
import { getFlowDirection, gridToWorld } from './flowSimulation';
import { rgbaToHex } from '$lib/utils/color';

const FLOW_RENDER_LAYER = 1010; // Above highlighted conduits (999) and ports (1000)
const CIRCLE_RADIUS = CELL_SIZE / 3;
const ARROW_LAYER = 1011;

/**
 * Render filled pipes as colored circles
 */
export function renderFilledPipes(
	renderState: FlowRenderState,
	container: Container,
	filledPipes: Set<string>,
	element: IElement
): void {
	const color = rgbaToHex(element.colour, 0x3498db);

	for (const position of filledPipes) {
		if (!renderState.filledPipeGraphics.has(position)) {
			const worldPos = gridToWorld(position, CELL_SIZE);

			const graphics = new PIXI.Graphics();
			graphics.circle(0, 0, CIRCLE_RADIUS);
			graphics.fill({ color, alpha: 0.8 });
			graphics.position.set(worldPos.x, worldPos.y);
			graphics.zIndex = FLOW_RENDER_LAYER;
			graphics.label = `flow-${position}`;

			container.addChild(graphics);
			renderState.filledPipeGraphics.set(position, graphics);
		}
	}

	for (const [position, graphics] of renderState.filledPipeGraphics) {
		if (!filledPipes.has(position)) {
			graphics.destroy();
			renderState.filledPipeGraphics.delete(position);
		}
	}
}

/**
 * Render small arrow triangles on pipes showing flow direction.
 */
export function renderDirectionArrows(
	renderState: FlowRenderState,
	container: Container,
	pipeDirections: Map<string, string[]>
): void {
	clearDirectionArrows(renderState);

	let index = 0;
	for (const [position] of pipeDirections) {
		index++;
		if (index % 3 !== 0) continue;

		const direction = getFlowDirection(position, pipeDirections);
		if (!direction) continue;

		const worldPos = gridToWorld(position, CELL_SIZE);
		const graphics = new PIXI.Graphics();

		const angle = Math.atan2(direction.dy, direction.dx);
		const arrowSize = 16;

		graphics.moveTo(arrowSize, 0);
		graphics.lineTo(-arrowSize * 0.6, -arrowSize * 0.6);
		graphics.lineTo(-arrowSize * 0.6, arrowSize * 0.6);
		graphics.closePath();
		graphics.fill({ color: 0xffffff, alpha: 0.6 });

		graphics.position.set(worldPos.x, worldPos.y);
		graphics.rotation = angle;
		graphics.zIndex = ARROW_LAYER;
		graphics.label = `arrow-${position}`;

		container.addChild(graphics);
		renderState.directionArrowGraphics.set(position, graphics);
	}
}

/**
 * Animate fill circles: each circle moves from current cell to next cell over 1s continuously.
 */
export function animatePacketsFlow(
	renderState: FlowRenderState,
	packetStates: Map<string, PacketState>,
	progress: number // 0→1 per step
): void {
	for (const [homePosition, graphics] of renderState.filledPipeGraphics) {
		const state = packetStates.get(homePosition);

		if (!state || !state.to) {
			const pos = gridToWorld(state ? state.from : homePosition, CELL_SIZE);
			graphics.position.set(pos.x, pos.y);
			continue;
		}

		const fromPos = gridToWorld(state.from, CELL_SIZE);
		const toPos = gridToWorld(state.to, CELL_SIZE);

		const x = fromPos.x + (toPos.x - fromPos.x) * progress;
		const y = fromPos.y + (toPos.y - fromPos.y) * progress;
		graphics.position.set(x, y);
	}
}

/**
 * Reset all fill circles to their home positions (when stopping simulation).
 */
export function resetFlowCirclePositions(renderState: FlowRenderState): void {
	for (const [position, graphics] of renderState.filledPipeGraphics) {
		const homePos = gridToWorld(position, CELL_SIZE);
		graphics.position.set(homePos.x, homePos.y);
	}
}

function clearDirectionArrows(renderState: FlowRenderState): void {
	for (const [, graphics] of renderState.directionArrowGraphics) {
		graphics.destroy();
	}
	renderState.directionArrowGraphics.clear();
}

/**
 * Clear all flow rendering
 */
export function clearFlowRendering(renderState: FlowRenderState, container: Container): void {
	clearDirectionArrows(renderState);

	for (const [, graphics] of renderState.filledPipeGraphics) {
		graphics.destroy();
	}
	renderState.filledPipeGraphics.clear();
}
