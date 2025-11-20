import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Get the JWT token from cookies
	const token = event.cookies.get('jwt_esb');

	if (token) {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
				headers: {
					Cookie: `jwt_esb=${token}`
				},
				credentials: 'include'
			});

			if (response.ok) {
				const user = await response.json();
				event.locals.user = user;
			} else {
				event.cookies.delete('jwt_esb', { path: '/' });
			}
		} catch (error) {
			console.error('Error fetching user:', error);
		}
	}

	return resolve(event);
};
