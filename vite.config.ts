import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [react(), tailwindcss()],
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
		port: 5173,
		proxy: {
			'/api': 'http://localhost:3000',
		},
	},
})
