import type { IElement } from 'src/interface/element';
import type { FlowRenderState, PacketState } from 'src/interface/pipeFlow';
import {
	clearFlowRendering,
	clearDirectionArrows,
	animatePacketsFlow,
	resetFlowCirclePositions
} from '$lib/core/simulation/renderer';
import { autoFillFromPosition } from '$lib/core/simulation/fill';
import { calculateDirections, initPackets, applyMoves } from '$lib/core/simulation/calculation';
import { getConnectedPipes } from '$lib/core/simulation/helpers';
import { blueprint } from '$lib/state/blueprint.svelte';
import { appConfig } from '$lib/state/config.svelte';
import { ACTION } from '$lib/constant';

const STEP_DURATION = 1000; // 1 grid/second (1x speed)

class FlowSimulation {
	isSimulationMode = $state(false);
	selectedElement = $state<IElement | null>(null);
	filledPipes = $state<Set<string>>(new Set());
	fillMode = $state<'manual' | 'auto'>('manual');
	pipeDirections = $state<Map<string, string[]>>(new Map());
	portPairs = $state<Map<string, string>>(new Map());
	isRunning = $state(false);

	// Flow animation progress
	flowProgress = 0;
	packetStates: PacketState[] = [];

	renderState = $state<FlowRenderState>({
		filledPipeGraphics: new Map(),
		directionArrowGraphics: new Map(),
		tickerCallback: null
	});

	enterSimulationMode() {
		this.isSimulationMode = true;
		appConfig.selectedAction = ACTION.SELECT;
	}

	exitSimulationMode() {
		this.isRunning = false;
		this.pipeDirections = new Map();
		this.portPairs = new Map();
		this.packetStates = [];
		this.flowProgress = 0;
		this.filledPipes = new Set();

		if (blueprint.buildContainer) {
			clearFlowRendering(this.renderState, blueprint.buildContainer);
		}

		this.selectedElement = null;
		this.fillMode = 'auto';
		this.isSimulationMode = false;
	}

	toggleFill(position: string) {
		const newSet = new Set(this.filledPipes);
		if (newSet.has(position)) {
			newSet.delete(position);
		} else {
			newSet.add(position);
		}
		this.filledPipes = newSet;
	}

	autoFill(clickedPosition: string) {
		if (this.filledPipes.has(clickedPosition)) {
			const toRemove = new Set<string>();
			const queue = [clickedPosition];
			toRemove.add(clickedPosition);

			while (queue.length > 0) {
				const current = queue.shift()!;
				const connections = getConnectedPipes(current);
				for (const neighbor of connections) {
					if (toRemove.has(neighbor)) continue;
					if (this.filledPipes.has(neighbor)) {
						toRemove.add(neighbor);
						queue.push(neighbor);
					}
				}
			}

			const newSet = new Set(this.filledPipes);
			for (const pos of toRemove) {
				newSet.delete(pos);
			}
			this.filledPipes = newSet;
		} else {
			const newFills = autoFillFromPosition(clickedPosition);
			if (newFills.size > 0) {
				const merged = new Set(this.filledPipes);
				for (const pos of newFills) {
					merged.add(pos);
				}
				this.filledPipes = merged;
			}
		}
	}

	startSimulation() {
		if (!this.selectedElement) return;
		if (this.filledPipes.size === 0) return;
		if (this.isRunning) return;

		// Resume: if packetStates exist from a previous pause, just resume
		if (this.packetStates.length > 0 && this.pipeDirections.size > 0) {
			this.isRunning = true;
			return;
		}

		calculateDirections(this.filledPipes);

		if (this.pipeDirections.size === 0) {
			return;
		}

		this.packetStates = initPackets(this.filledPipes, this.selectedElement);

		// Attach graphics references from filledPipeGraphics
		for (const packet of this.packetStates) {
			packet.graphics = this.renderState.filledPipeGraphics.get(packet.from);
		}

		this.flowProgress = 0;
		this.isRunning = true;
	}

	stopSimulation() {
		this.isRunning = false;
	}

	resetSimulation() {
		this.isRunning = false;
		this.pipeDirections = new Map();
		this.portPairs = new Map();
		this.packetStates = [];
		this.flowProgress = 0;

		resetFlowCirclePositions(this.renderState);
		clearDirectionArrows(this.renderState);
	}

	updateFlow(deltaMS: number) {
		if (!this.isRunning) return;

		this.flowProgress += deltaMS / STEP_DURATION;

		while (this.flowProgress >= 1) {
			this.flowProgress -= 1;
			if (!applyMoves(this.packetStates)) {
				this.isRunning = false;
				return;
			}
		}

		animatePacketsFlow(this.packetStates, this.flowProgress);
	}
}

export const pipeFlowState = new FlowSimulation();
