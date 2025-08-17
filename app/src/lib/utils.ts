import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ComponentType, Snippet } from 'svelte';
import { OVERLAY } from '@shared/src/enum';

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
