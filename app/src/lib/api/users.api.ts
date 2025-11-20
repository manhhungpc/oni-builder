import { fetchAPI } from './index';

export interface User {
	id: string;
	name: string;
	email: string;
	avatar: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export async function getCurrentUser(): Promise<User> {
	return fetchAPI<User>('/api/users/me');
}

export function loginWithGoogle(): void {
	window.location.href = `${import.meta.env.VITE_API_URL}/api/users/auth/login`;
}

export async function logout(): Promise<void> {
	await fetch('/kit-api/logout', { method: 'POST' });
	window.location.href = '/';
}
