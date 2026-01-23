import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient()

// Create a new router instance
export const getRouter = () => {
	const router = createRouter({
		routeTree,
		context: {
			queryClient,
		},
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: () => (
			<div className="flex h-screen items-center justify-center">
				<div className="text-center">
					<h1 className="font-bold text-4xl">404</h1>
					<p className="mt-2 text-muted-foreground">Page not found</p>
				</div>
			</div>
		),
	})
	setupRouterSsrQueryIntegration({ router, queryClient })

	return router
}
