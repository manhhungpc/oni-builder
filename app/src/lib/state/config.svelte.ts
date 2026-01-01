import type { AppConfig, AppMessage } from 'src/interface';
import { ACTION, OVERLAY } from 'src/lib/constant';

export const appConfig = $state<AppConfig>({
	panSpeed: 1,
	zoomLevel: 100,
	selectedAction: ACTION.SELECT,
	selectedOverlay: OVERLAY.BUILDING,
	selectedToBuild: null,
	sidebarOpen: false
});

export const mousePosition = $state<{ x: number; y: number }>({
	x: 0,
	y: 0
});

export const message = $state<AppMessage>({
	text: '',
	popup: ''
});
