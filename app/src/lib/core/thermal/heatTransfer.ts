import type { ElementWithThermal } from 'src/interface/element';
import { applicableTC } from 'src/lib/core/thermal/conductivity';

const API_URL = 'http://localhost:3003/api';

export async function getElementData(idx: number): Promise<ElementWithThermal> {
	const response = await fetch(`${API_URL}/elements/${idx}`);
	if (!response.ok) throw new Error(`Element idx ${idx} not found`);
	return response.json();
}

// Heat Transfer q, in (DTU/tick), 1 tick = 0.2s
function calculateHeatTransfer(elementA: ElementWithThermal, elementB: ElementWithThermal) {
	const deltaTemp = Math.abs(elementA.temperature - elementB.temperature);
	const tcA = elementA.thermalConductivity;
	const tcB = elementB.thermalConductivity;

	const heatTransfer: Record<string, number> = {
		'solid:solid': deltaTemp * applicableTC(tcA, tcB, 'geometric') * 1000,
		'solid:liquid': deltaTemp * applicableTC(tcA, tcB, 'geometric') * 1000,
		'liquid:solid': deltaTemp * applicableTC(tcA, tcB, 'geometric') * 1000,
		'gas:gas': deltaTemp * applicableTC(tcA, tcB, 'geometric') * 1000,
		'gas:liquid': deltaTemp * applicableTC(tcA, tcB, 'geometric') * 1000,
		'liquid:gas': deltaTemp * applicableTC(tcA, tcB, 'geometric') * 1000,

		'liquid:liquid': deltaTemp * applicableTC(tcA, tcB, 'geometric') * 1000 * 625,

		'solid:gas': deltaTemp * applicableTC(tcA, tcB, 'geometric') * 1000 * 25,
		'gas:solid': deltaTemp * applicableTC(tcA, tcB, 'geometric') * 1000 * 25
	};

	const key = `${elementA.type}:${elementB.type}`;
	return heatTransfer[key];
}

function themalMassPerArea(
	hotElement: ElementWithThermal,
	type: 'building' | 'tiles',
	area: number
) {
	let massScaleFactor = type === 'building' ? 0.2 : 1;
	return (massScaleFactor * hotElement.mass * hotElement.specificHeatCapacity) / area;
}

// Heat change in 1 tick = 0.2s
export function calculateHeatChange(elementA: ElementWithThermal, elementB: ElementWithThermal) {
	const q = calculateHeatTransfer(elementA, elementB) * 0.2; // DTU/s

	const tempChangeA: number = q / (elementA.specificHeatCapacity * elementA.mass * 1000);
	const tempChangeB: number = q / (elementB.specificHeatCapacity * elementB.mass * 1000);

	let finalTempA: number, finalTempB: number;
	if (elementA.temperature > elementB.temperature) {
		finalTempA = elementA.temperature - tempChangeA;
		finalTempB = elementB.temperature + tempChangeB;
	} else {
		finalTempA = elementA.temperature + tempChangeA;
		finalTempB = elementB.temperature - tempChangeB;
	}
	return {
		finalTempA,
		finalTempB
	};
}

// Building ↔ Element

// export function transferBuildingToElement(
// 	building: IElement,
// 	element: IElement,
// 	tempBuilding: number,
// 	tempElement: number,
// 	massHot: number,
// 	area: number,
// 	massScale: number,
// 	deltaTime: number
// ): number {
// 	return 0;
// }

// Building ↔ Building

// export function transferBuildingToBuilding(
// 	buildingA: IElement,
// 	buildingB: IElement,
// 	tempBuildingA: number,
// 	tempBuildingB: number,
// 	massHot: number,
// 	area: number,
// 	massScale: number,
// 	deltaTime: number
// ): number {
// 	return 0;
// }
