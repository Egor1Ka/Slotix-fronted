import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getUser } from '@/lib/auth/get-user'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'

async function Header() {
	const t = await getTranslations('landing')
	const user = await getUser()
	const authHref = user ? '/organizations' : '/login'

	return (
		<header
			data-slot="landing-header"
			className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-xl"
		>
			<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Logo href="/" size="md" label={t('nav.logo')} />

				<nav className="hidden items-center gap-8 md:flex">
					<a
						href="#audiences"
						className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						{t('nav.audiences')}
					</a>
					<a
						href="#features"
						className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						{t('nav.features')}
					</a>
					<a
						href="#pricing"
						className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						{t('nav.pricing')}
					</a>
				</nav>

				<div className="flex items-center gap-3">
					<ThemeToggle />
					<LanguageSwitcher />
					<Link
						href={authHref}
						className="bg-foreground text-background inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-all hover:opacity-90"
					>
						{user ? t('nav.signup') : t('nav.login')}
					</Link>
				</div>
			</div>
		</header>
	)
}

export { Header }
