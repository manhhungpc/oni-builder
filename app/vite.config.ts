import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 5170
	},
	resolve: {
		alias: {
			'@shared': path.resolve('../shared')
		}
	}
});
