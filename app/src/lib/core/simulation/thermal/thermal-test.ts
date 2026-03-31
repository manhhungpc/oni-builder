import { calculateHeatChange, getElementData } from './heatTransfer';

const TICK_INTERVAL = 0.2;
const DURATION_SECONDS = 10;

const elementA = {
	idx: 50, // Gold
	mass: 1000,
	startTemp: 1
};

const elementB = {
	idx: 13, // Copper
	mass: 1000,
	startTemp: 100
};

async function run() {
	const [elA, elB] = await Promise.all([
		getElementData(elementA.idx),
		getElementData(elementB.idx)
	]);

	elA.mass = elementA.mass;
	elA.temperature = elementA.startTemp;
	elB.mass = elementB.mass;
	elB.temperature = elementB.startTemp;

	const totalTicks = Math.floor(DURATION_SECONDS / TICK_INTERVAL);

	console.log(`\n${elA.name} (${elA.type}) ↔ ${elB.name} (${elB.type})`);
	console.log(
		`Duration: ${DURATION_SECONDS}s | Tick: ${TICK_INTERVAL}s | Total ticks: ${totalTicks}\n`
	);
	console.log(
		'Tick'.padStart(5),
		'Time(s)'.padStart(9),
		`${elA.name} °C`.padStart(14),
		`${elB.name} °C`.padStart(14)
	);
	console.log('-'.repeat(44));

	for (let tick = 0; tick <= totalTicks; tick++) {
		if (tick > 0) {
			const { finalTempA, finalTempB } = calculateHeatChange(elA, elB);
			elA.temperature = finalTempA;
			elB.temperature = finalTempB;
		}

		console.log(
			String(tick).padStart(5),
			(tick * TICK_INTERVAL).toFixed(1).padStart(9),
			elA.temperature.toFixed(2).padStart(14),
			elB.temperature.toFixed(2).padStart(14)
		);
	}
}

run().catch(console.error);
