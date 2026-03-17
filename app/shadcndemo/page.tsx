'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Moon, Sun } from 'lucide-react'

import AccordionExample from '@/components/example/accordion-example'
import AlertExample from '@/components/example/alert-example'
import AlertDialogExample from '@/components/example/alert-dialog-example'
import AspectRatioExample from '@/components/example/aspect-ratio-example'
import AvatarExample from '@/components/example/avatar-example'
import BadgeExample from '@/components/example/badge-example'
import BreadcrumbExample from '@/components/example/breadcrumb-example'
import ButtonExample from '@/components/example/button-example'
import ButtonGroupExample from '@/components/example/button-group-example'
import CalendarExample from '@/components/example/calendar-example'
import CardExample from '@/components/example/card-example'
import CarouselExample from '@/components/example/carousel-example'
import CheckboxExample from '@/components/example/checkbox-example'
import CollapsibleExample from '@/components/example/collapsible-example'
import CommandExample from '@/components/example/command-example'
import ContextMenuExample from '@/components/example/context-menu-example'
import DialogExample from '@/components/example/dialog-example'
import DrawerExample from '@/components/example/drawer-example'
import DropdownMenuExample from '@/components/example/dropdown-menu-example'
import EmptyExample from '@/components/example/empty-example'
import FieldExample from '@/components/example/field-example'
import HoverCardExample from '@/components/example/hover-card-example'
import InputExample from '@/components/example/input-example'
import InputGroupExample from '@/components/example/input-group-example'
import InputOtpExample from '@/components/example/input-otp-example'
import ItemExample from '@/components/example/item-example'
import KbdExample from '@/components/example/kbd-example'
import LabelExample from '@/components/example/label-example'
import MenubarExample from '@/components/example/menubar-example'
import NativeSelectExample from '@/components/example/native-select-example'
import NavigationMenuExample from '@/components/example/navigation-menu-example'
import PaginationExample from '@/components/example/pagination-example'
import PopoverExample from '@/components/example/popover-example'
import ProgressExample from '@/components/example/progress-example'
import RadioGroupExample from '@/components/example/radio-group-example'
import ResizableExample from '@/components/example/resizable-example'
import ScrollAreaExample from '@/components/example/scroll-area-example'
import SelectExample from '@/components/example/select-example'
import SeparatorExample from '@/components/example/separator-example'
import SheetExample from '@/components/example/sheet-example'
import SkeletonExample from '@/components/example/skeleton-example'
import SliderExample from '@/components/example/slider-example'
import SonnerExample from '@/components/example/sonner-example'
import SpinnerExample from '@/components/example/spinner-example'
import SwitchExample from '@/components/example/switch-example'
import TableExample from '@/components/example/table-example'
import TabsExample from '@/components/example/tabs-example'
import TextareaExample from '@/components/example/textarea-example'
import ToggleExample from '@/components/example/toggle-example'
import ToggleGroupExample from '@/components/example/toggle-group-example'
import TooltipExample from '@/components/example/tooltip-example'

const sections = [
	{ title: 'Accordion', component: AccordionExample },
	{ title: 'Alert', component: AlertExample },
	{ title: 'Alert Dialog', component: AlertDialogExample },
	{ title: 'Aspect Ratio', component: AspectRatioExample },
	{ title: 'Avatar', component: AvatarExample },
	{ title: 'Badge', component: BadgeExample },
	{ title: 'Breadcrumb', component: BreadcrumbExample },
	{ title: 'Button', component: ButtonExample },
	{ title: 'Button Group', component: ButtonGroupExample },
	{ title: 'Calendar', component: CalendarExample },
	{ title: 'Card', component: CardExample },
	{ title: 'Carousel', component: CarouselExample },
	{ title: 'Checkbox', component: CheckboxExample },
	{ title: 'Collapsible', component: CollapsibleExample },
	{ title: 'Command', component: CommandExample },
	{ title: 'Context Menu', component: ContextMenuExample },
	{ title: 'Dialog', component: DialogExample },
	{ title: 'Drawer', component: DrawerExample },
	{ title: 'Dropdown Menu', component: DropdownMenuExample },
	{ title: 'Empty', component: EmptyExample },
	{ title: 'Field', component: FieldExample },
	{ title: 'Hover Card', component: HoverCardExample },
	{ title: 'Input', component: InputExample },
	{ title: 'Input Group', component: InputGroupExample },
	{ title: 'Input OTP', component: InputOtpExample },
	{ title: 'Item', component: ItemExample },
	{ title: 'Kbd', component: KbdExample },
	{ title: 'Label', component: LabelExample },
	{ title: 'Menubar', component: MenubarExample },
	{ title: 'Native Select', component: NativeSelectExample },
	{ title: 'Navigation Menu', component: NavigationMenuExample },
	{ title: 'Pagination', component: PaginationExample },
	{ title: 'Popover', component: PopoverExample },
	{ title: 'Progress', component: ProgressExample },
	{ title: 'Radio Group', component: RadioGroupExample },
	{ title: 'Resizable', component: ResizableExample },
	{ title: 'Scroll Area', component: ScrollAreaExample },
	{ title: 'Select', component: SelectExample },
	{ title: 'Separator', component: SeparatorExample },
	{ title: 'Sheet', component: SheetExample },
	{ title: 'Skeleton', component: SkeletonExample },
	{ title: 'Slider', component: SliderExample },
	{ title: 'Sonner (Toast)', component: SonnerExample },
	{ title: 'Spinner', component: SpinnerExample },
	{ title: 'Switch', component: SwitchExample },
	{ title: 'Table', component: TableExample },
	{ title: 'Tabs', component: TabsExample },
	{ title: 'Textarea', component: TextareaExample },
	{ title: 'Toggle', component: ToggleExample },
	{ title: 'Toggle Group', component: ToggleGroupExample },
	{ title: 'Tooltip', component: TooltipExample },
]

export default function ShadcnDemoPage() {
	const [dark, setDark] = useState(false)

	useEffect(() => {
		document.documentElement.classList.toggle('dark', dark)
	}, [dark])

	return (
		<TooltipProvider>
			<Toaster />
			<div className="container mx-auto max-w-4xl space-y-12 p-8 pb-20">
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<h1 className="text-4xl font-bold tracking-tight">
							shadcn/ui Demo
						</h1>
						<p className="text-muted-foreground">
							Все компоненты shadcn/ui в одном месте.
						</p>
					</div>
					<Button variant="outline" size="icon" onClick={() => setDark(!dark)}>
						{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</Button>
				</div>

				{sections.map(({ title, component: Component }) => (
					<section key={title} className="space-y-4">
						<h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
						<Separator />
						<div className="space-y-4">
							<Component />
						</div>
					</section>
				))}
			</div>
		</TooltipProvider>
	)
}
