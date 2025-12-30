import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [
		devtools(),
		tanstackRouter({
			target: 'react',
			autoCodeSplitting: true,
			routesDirectory: './src/client/routes',
			generatedRouteTree: './src/client/routeTree.gen.ts',
		}),
		react(),
		tailwindcss(),
	],
	root: '.',
	publicDir: 'public',
	resolve: {
		alias: {
			'@/client': resolve(__dirname, './src/client'),
			'@/server': resolve(__dirname, './src/server'),
			'@/shared': resolve(__dirname, './src/shared'),
		},
	},
	build: {
		outDir: 'dist/client',
	},
	server: {
		port: 2828,
		proxy: {
			'/api': 'http://localhost:2829',
		},
	},
})
