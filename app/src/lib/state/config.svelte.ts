import type { AppConfig, AppMessage } from 'src/interface';
import { ACTION, OVERLAY } from 'src/lib/constant';
import { browser } from '$app/environment';

export const appConfig = $state<AppConfig>({
	panSpeed: 1,
	zoomLevel: 100,
	selectedAction: ACTION.SELECT,
	selectedOverlay: OVERLAY.BUILDING,
	selectedToBuild: null,
	selectedElement: null,
	paintMass: 100,
	paintTemperature: 20,
	sidebarOpen: false,
	devMode: false
});

export const mousePosition = $state<{ x: number; y: number }>({
	x: 0,
	y: 0
});

export const message = $state<AppMessage>({
	text: '',
	popup: ''
});

export function setDevMode(enabled?: boolean) {
	if (!browser) return;
	const value = enabled ?? localStorage.getItem('devMode') === 'true';
	if (enabled !== undefined) {
		localStorage.setItem('devMode', String(value));
	}
	appConfig.devMode = value;
}
