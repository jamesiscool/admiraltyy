#!/usr/bin/env bun
import { existsSync } from 'node:fs'

const [plan, spec] = process.argv.slice(2)

if (!plan) {
	console.error('Usage: ralph.ts <plan> [spec]')
	process.exit(1)
}

const maxIterations = 10
const completeFlag = 'ralph_complete'

// Build declaration header
const declarations = [`plan: ${plan}`, spec ? `spec: ${spec}` : null].filter(Boolean).join('\n')

const basePrompt = await Bun.file('prompt.md').text()
const fullPrompt = `${declarations}\n\n${basePrompt}`

for (let i = 1; i <= maxIterations; i++) {
	if (existsSync(completeFlag)) {
		console.log(`All tasks complete (found ${completeFlag}). Exiting.`)
		process.exit(0)
	}

	const prompt = new TextEncoder().encode(fullPrompt)
	const proc = Bun.spawn(['claude', '--dangerously-skip-permissions'], {
		stdin: prompt,
		stdout: 'inherit',
		stderr: 'inherit',
	})
	await proc.exited

	console.log(`Completed iteration ${i}`)
}

console.log(`Reached maximum iterations (${maxIterations}). Exiting.`)
