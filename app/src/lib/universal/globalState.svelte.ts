import type { AppConfig, AppMessage, GlobalState, PlacedBuildings } from 'src/interface';
import { ACTION } from 'src/lib/constant';

export const globalState = $state<GlobalState>({
    pixiApp: null,
    currentAction: ACTION.SELECT,
    selectedBuilding: null,
    initWindowWidth: 0,
    initWindowHeight: 0,
    currentOverlays: {
        value: 0,
        text: 'Buildings',
    },
    camera: null,
    buildContainer: null,
    isValidPlacement: false,
});

export const appConfig = $state<AppConfig>({
    panSpeed: 1,
});

export const placedBuildings = $state<PlacedBuildings[]>([]);

export const gridPosition = $state<{ x: number; y: number }>({
    x: 0,
    y: 0,
});

export const mousePosition = $state<{ x: number; y: number }>({
    x: 0,
    y: 0,
});

export const message = $state<AppMessage>({
    text: '',
    popup: '',
});
