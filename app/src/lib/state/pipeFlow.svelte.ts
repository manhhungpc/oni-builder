import type { IElement } from 'src/interface/element';
import type { FlowRenderState, PacketState } from 'src/interface/pipeFlow';
import {
	clearFlowRendering,
	animatePacketsFlow,
	resetFlowCirclePositions
} from '$lib/core/simulation/flowRenderer';
import {
	autoFillFromPosition,
	calculateDirections,
	getConnectedPipes
} from '$lib/core/simulation/flowSimulation';
import { blueprint } from '$lib/state/blueprint.svelte';
import { appConfig } from '$lib/state/config.svelte';
import { ACTION } from '$lib/constant';

const STEP_DURATION = 1000; // 1 grid/second (1x speed)

class FlowSimulationStore {
	isSimulationMode = $state(false);
	selectedElement = $state<IElement | null>(null);
	filledPipes = $state<Set<string>>(new Set());
 	fillMode = $state<'manual' | 'auto'>('manual');
	pipeDirections = $state<Map<string, string[]>>(new Map());
	isRunning = $state(false);

	// Flow animation progress
	flowProgress = 0;
	packetStates: Map<string, PacketState> = new Map();

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
		this.stopSimulation();
		this.filledPipes = new Set();
		this.pipeDirections = new Map();

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

		this.pipeDirections = calculateDirections(this.filledPipes);
		this.flowProgress = 0;

		console.log('[SIM] pipeDirections:', [...this.pipeDirections.entries()]);

		if (this.pipeDirections.size === 0) {
			return;
		}

		this.packetStates = new Map();
		for (const pos of this.filledPipes) {
			this.packetStates.set(pos, { from: pos });
		}
		this.forwardPackets();

		this.isRunning = true;
	}

	stopSimulation() {
		this.isRunning = false;
		this.pipeDirections = new Map();
		this.flowProgress = 0;
		this.packetStates = new Map();

		// Reset circles back to home positions
		resetFlowCirclePositions(this.renderState);
	}

	resetSimulation() {
		this.stopSimulation();
		this.filledPipes = new Set();

		if (blueprint.buildContainer) {
			clearFlowRendering(this.renderState, blueprint.buildContainer);
		}
		this.renderState = {
			filledPipeGraphics: new Map(),
			directionArrowGraphics: new Map(),
			tickerCallback: null
		};
	}

	/**
	 * Move each packet to its next cell.
	 * Returns false when ALL packets have reached dead ends.
	 */
	private forwardPackets(): boolean {
		for (const [, state] of this.packetStates) {
			if (!state.to) {
				// First call — set initial direction
				const nextCells = this.pipeDirections.get(state.from);
				if (nextCells && nextCells.length > 0) {
					state.to = nextCells[0];
				}
				continue;
			}

			state.from = state.to;
			const nextCells = this.pipeDirections.get(state.from);

			if (nextCells && nextCells.length > 0) {
				state.to = nextCells[0];
			} else {
				state.to = undefined;
				continue;
			}
		}

		const allStopped = [...this.packetStates.values()].every((s) => !s.to);
		return !allStopped;
	}

	/**
	 * Called every frame by the ticker when simulation is running.
	 */
	updateFlow(deltaMS: number) {
		if (!this.isRunning) return;

		this.flowProgress += deltaMS / STEP_DURATION;

		while (this.flowProgress >= 1) {
			this.flowProgress -= 1;
			if (!this.forwardPackets()) {
				this.isRunning = false;
				return;
			}
		}

		animatePacketsFlow(this.renderState, this.packetStates, this.flowProgress);
	}
}

export const pipeFlowState = new FlowSimulationStore();
