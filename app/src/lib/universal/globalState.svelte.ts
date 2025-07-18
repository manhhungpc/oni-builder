import { MODE, OVERLAY } from '@shared/src/enum';
import type { AppMessage, GlobalState, PlacedBuildings } from 'src/interface';

export const globalState = $state<GlobalState>({
    pixiApp: null,
    currentMode: MODE.VIEW,
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
