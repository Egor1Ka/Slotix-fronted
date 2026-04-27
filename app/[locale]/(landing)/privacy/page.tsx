import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations('legal.privacy')
	return {
		title: t('title'),
		description: t('intro'),
		alternates: { canonical: '/privacy' },
	}
}

type Section = { heading: string; body: string }

export default async function PrivacyPage() {
	const t = await getTranslations('legal.privacy')
	const sections = t.raw('sections') as Section[]

	const renderSection = (section: Section, index: number) => (
		<section key={index} className="space-y-3">
			<h2 className="text-2xl font-semibold tracking-tight">
				{section.heading}
			</h2>
			<p className="text-muted-foreground leading-relaxed whitespace-pre-line">
				{section.body}
			</p>
		</section>
	)

	return (
		<main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
			<header className="mb-10 space-y-3">
				<p className="font-mono text-xs tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
					{t('eyebrow')}
				</p>
				<h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
					{t('title')}
				</h1>
				<p className="text-muted-foreground text-sm">{t('updated')}</p>
				<p className="text-muted-foreground text-base leading-relaxed">
					{t('intro')}
				</p>
			</header>

			<div className="space-y-8">{sections.map(renderSection)}</div>

			<footer className="border-border/40 mt-12 border-t pt-6">
				<p className="text-muted-foreground text-sm">
					{t('contact')}{' '}
					<a
						href="mailto:egorzozulia@gmail.com"
						className="text-foreground font-medium underline underline-offset-4 hover:text-emerald-600 dark:hover:text-emerald-400"
					>
						egorzozulia@gmail.com
					</a>
				</p>
			</footer>
		</main>
	)
}
