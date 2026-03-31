import {
	initThermalState,
	stepThermal,
	type ThermalState
} from '$lib/core/simulation/thermal/thermalSimulation';
import { blueprint } from '$lib/state/blueprint.svelte';

const THERMAL_TICK_MS = 200; // 1 thermal tick = 0.2s game time

class ThermalSimulation {
	isRunning = $state(false);
	thermalState: ThermalState | null = null;
	thermalProgress = 0;

	/** Scan placed solid elements and build adjacency pairs */
	init() {
		this.thermalState = initThermalState(blueprint.placedElements);
		this.thermalProgress = 0;
	}

	start() {
		if (this.isRunning) return;
		this.thermalProgress = 0;
		this.isRunning = true;
	}

	stop() {
		this.isRunning = false;
	}

	/** Reset temperatures by re-scanning placed elements */
	reset() {
		this.isRunning = false;
		this.thermalProgress = 0;
		this.thermalState = initThermalState(blueprint.placedElements);
	}

	cleanup() {
		this.isRunning = false;
		this.thermalState = null;
		this.thermalProgress = 0;
	}

	/** Called every frame from the PIXI ticker */
	update(deltaMS: number) {
		if (!this.isRunning || !this.thermalState || this.thermalState.cells.length === 0) return;

		this.thermalProgress += deltaMS;

		while (this.thermalProgress >= THERMAL_TICK_MS) {
			this.thermalProgress -= THERMAL_TICK_MS;
			stepThermal(this.thermalState);
		}
	}
}

export const thermalSimState = new ThermalSimulation();
