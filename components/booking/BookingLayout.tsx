'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BookingSidebar } from './BookingSidebar'

interface BookingLayoutProps {
	children: React.ReactNode
}

function BookingLayout({ children }: BookingLayoutProps) {
	return (
		<TooltipProvider>
			<SidebarProvider>
				<BookingSidebar />
				<SidebarInset>
					<header className="bg-background sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-4">
						<SidebarTrigger className="-ml-1" />
					</header>
					<main className="flex-1">{children}</main>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	)
}

export { BookingLayout }
