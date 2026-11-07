import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: [
		{
			command: 'spacetime start',
			port: 3000,
		},
		{
			command: 'pnpm build && spacetime dev --run "pnpm preview"',
			port: 4173,
		},
	],
	use: { baseURL: 'http://localhost:4173' },
	testMatch: '**/*.e2e.{ts,js}',
});
