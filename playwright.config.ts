import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	fullyParallel: false,
	workers: 1,
	webServer: [
		{
			name: 'Spacetime',
			command: 'spacetime start',
			port: 3000,
			timeout: 120_000,
		},
		{
			name: 'App',
			command: 'pnpm vite build && spacetime dev --run "pnpm preview"',
			port: 4173,
			timeout: 300_000,
		},
	],
	use: { baseURL: 'http://localhost:4173' },
	testMatch: '**/*.e2e.{ts,js}',
	projects: [
		{
			name: 'chrome',
			use: { ...devices['Desktop Chrome'], channel: 'chrome' },
		},
	],
});
