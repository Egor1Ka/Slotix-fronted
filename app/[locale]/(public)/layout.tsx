import { LanguageSwitcher } from '@/components/language-switcher'

export default function PublicLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<main className="min-h-svh">
			<div className="fixed top-4 right-4 z-50">
				<LanguageSwitcher />
			</div>
			{children}
		</main>
	)
}
