import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'

function AppHeader() {
	return (
		<header
			data-slot="app-header"
			className="border-border/40 bg-background/70 supports-[backdrop-filter]:bg-background/50 sticky top-0 z-40 w-full border-b backdrop-blur-xl"
		>
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Logo size="sm" />
				<div className="flex items-center gap-2">
					<ThemeToggle />
					<LanguageSwitcher />
				</div>
			</div>
		</header>
	)
}

export { AppHeader }
