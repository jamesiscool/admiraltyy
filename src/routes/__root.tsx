import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import Header from '@/components/header'
import appCss from '@/styles.css?url'

interface MyRouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{
				title: 'Admiraltyy',
			},
		],
		links: [
			{
				rel: 'stylesheet',
				href: appCss,
			},
		],
	}),

	component: RootComponent,
})

function RootComponent() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<div className="flex h-screen flex-col">
					<Header />
					<main className="flex grow flex-col">
						<Outlet />
					</main>
					<TanStackDevtools
						config={{
							position: 'bottom-right',
						}}
						plugins={[
							{
								name: 'TanStack Router',
								render: <TanStackRouterDevtoolsPanel />,
							},
							{
								name: 'TanStack Query',
								render: <ReactQueryDevtoolsPanel />,
							},
						]}
					/>
				</div>
				<Scripts />
			</body>
		</html>
	)
}
