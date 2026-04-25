import Link from 'next/link'
import { LogoMark } from '@/components/logo'

const currentYear = new Date().getFullYear()

function AppFooter() {
	return (
		<footer
			data-slot="app-footer"
			className="border-border/40 mt-auto border-t"
		>
			<div className="mx-auto flex h-10 max-w-7xl items-center justify-center gap-2 px-4 text-xs sm:px-6 lg:px-8">
				<Link
					href="/"
					aria-label="Slotix"
					className="group inline-flex items-center gap-2 transition-opacity hover:opacity-80"
				>
					<LogoMark size={18} />
					<span className="text-foreground text-sm font-semibold tracking-tight">
						Slotix
					</span>
				</Link>
				<span className="text-muted-foreground/40 select-none">·</span>
				<span className="text-muted-foreground">© {currentYear}</span>
			</div>
		</footer>
	)
}

export { AppFooter }
