import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/activity')({
	component: Outlet,
})
