import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OVERLAY, PORT } from 'src/lib/constant';
import {
    liquidPorts,
    gasPorts,
    powerPorts,
    logicPorts,
    conveyorPorts,
} from 'src/lib/universal/ports.svelte';
import type { OverlayInfo } from 'src/interface/building';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type WithoutChildrenOrChild<T> = T & {
    children?: never;
    child?: never;
};

export type WithElementRef<T> = T & {
    ref?: HTMLElement | null;
};

export function getPortSpriteAlias(overlayType: OVERLAY) {
    let portSpriteInput = '',
        portSpriteOutput = '';
    if (
        overlayType == OVERLAY.PLUMBING ||
        overlayType == OVERLAY.VENTILATION ||
        overlayType == OVERLAY.SHIPPING
    ) {
        portSpriteInput = 'conduit_input';
        portSpriteOutput = 'conduit_output';
    }

    if (overlayType == OVERLAY.POWER) {
        portSpriteInput = 'power_port';
        portSpriteOutput = 'power_port';
    }

    if (overlayType == OVERLAY.AUTOMATION) {
        portSpriteInput = 'logic_input';
        portSpriteOutput = 'logic_output';
    }

    return {
        portSpriteInput,
        portSpriteOutput,
    };
}

export function getOverlayInfo(overlay: OVERLAY): OverlayInfo | null {
    switch (overlay) {
        case OVERLAY.VENTILATION:
            return {
                name: 'Gas',
                ports: gasPorts,
                setPort: (key: string, portType: PORT) => gasPorts.set(key, portType),
            };
        case OVERLAY.PLUMBING:
            return {
                name: 'Liquid',
                ports: liquidPorts,
                setPort: (key: string, portType: PORT) => liquidPorts.set(key, portType),
            };
        case OVERLAY.POWER:
            return {
                name: 'Power',
                ports: powerPorts,
                setPort: (key: string, portType: PORT) => powerPorts.set(key, portType),
            };
        case OVERLAY.AUTOMATION:
            return {
                name: 'Logic',
                ports: logicPorts,
                setPort: (key: string, portType: PORT) => logicPorts.set(key, portType),
            };
        case OVERLAY.SHIPPING:
            return {
                name: 'Conveyor',
                ports: conveyorPorts,
                setPort: (key: string, portType: PORT) => conveyorPorts.set(key, portType),
            };
        default:
            return null;
    }
}
