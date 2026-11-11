import { defineConfig } from 'oxfmt';

export default defineConfig({
	singleQuote: true,
	tabWidth: 2,
	useTabs: true,
	sortTailwindcss: true,
	svelte: true,
	overrides: [
		{
			files: ['*.md'],
			options: {
				useTabs: false,
				printWidth: 80,
			},
		},
	],
});
