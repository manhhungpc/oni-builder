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
