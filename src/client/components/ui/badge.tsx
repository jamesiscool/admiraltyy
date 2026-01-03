import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/client/lib/utils'

const badgeVariants = cva(
	'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-4xl border border-transparent px-2 py-0.5 font-medium text-xs transition-all transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
	{
		variants: {
			variant: {
				default: 'bg-blue-100 text-primary [a]:hover:bg-blue-200',
				secondary: 'bg-pink-100 text-secondary [a]:hover:bg-pink-200',
				sage: 'bg-sage-100 text-sage [a]:hover:bg-sage-200',
				'sage-inverse': 'bg-sage-inverse text-sage-inverse-foreground [a]:hover:bg-sage-200',
				destructive: 'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
				outline: 'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
				ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
				link: 'text-primary underline-offset-4 hover:underline',
				wanted: 'text-white [background-color:rgba(245,158,11,0.9)]',
				downloaded: 'text-white [background-color:rgba(16,185,129,0.9)]',
				neutral: 'text-white [background-color:rgba(59,130,246,0.9)]',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

function Badge({ className, variant = 'default', render, ...props }: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
	return useRender({
		defaultTagName: 'span',
		props: mergeProps<'span'>(
			{
				className: cn(badgeVariants({ className, variant })),
			},
			props,
		),
		render,
		state: {
			slot: 'badge',
			variant,
		},
	})
}

export { Badge, badgeVariants }
