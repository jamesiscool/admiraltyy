import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { cn } from '@/client/lib/utils'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

function PopoverContent({
	className,
	align = 'start',
	alignOffset = 0,
	side = 'bottom',
	sideOffset = 4,
	children,
	...props
}: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				className="isolate z-50 outline-none"
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
			>
				<PopoverPrimitive.Popup
					data-slot="popover-content"
					className={cn(
						'data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-auto min-w-32 origin-(--transform-origin) rounded-md bg-popover p-3 text-popover-foreground shadow-md outline-none ring-1 ring-foreground/10 duration-100 data-closed:animate-out data-open:animate-in',
						className,
					)}
					{...props}
				>
					{children}
				</PopoverPrimitive.Popup>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	)
}

export { Popover, PopoverTrigger, PopoverContent }
