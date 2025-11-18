// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				name: string;
				email: string;
				avatar: string | null;
				createdAt: Date;
				updatedAt: Date;
			};
		}
		interface PageData {
			user?: {
				id: string;
				name: string;
				email: string;
				avatar: string | null;
				createdAt: Date;
				updatedAt: Date;
			};
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
