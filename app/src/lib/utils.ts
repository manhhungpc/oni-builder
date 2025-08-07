import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ComponentType, Snippet } from 'svelte';

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
