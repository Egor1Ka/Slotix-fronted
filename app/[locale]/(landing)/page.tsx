import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
	Zap,
	Shield,
	Smartphone,
	Globe,
	LayoutGrid,
	Wrench,
	Check,
	ArrowRight,
} from 'lucide-react'

const featureIcons = {
	performance: Zap,
	secure: Shield,
	responsive: Smartphone,
	i18n: Globe,
	components: LayoutGrid,
	dx: Wrench,
} as const

const featureLayout = [
	{ key: 'performance' as const, wide: true },
	{ key: 'secure' as const, wide: false },
	{ key: 'responsive' as const, wide: false },
	{ key: 'i18n' as const, wide: true },
	{ key: 'components' as const, wide: true },
	{ key: 'dx' as const, wide: false },
]

export default async function LandingPage() {
	const t = await getTranslations('landing')
	const planKeys = ['free', 'pro', 'enterprise'] as const

	return (
		<div className="flex flex-col">
			{/* Hero */}
			<section className="relative flex min-h-[90vh] items-center overflow-hidden px-4 py-32 sm:px-6 lg:px-8">
				<div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
					<div className="absolute left-[10%] top-[20%] h-[600px] w-[600px] animate-[landing-mesh-1_20s_ease-in-out_infinite] rounded-full bg-[oklch(0.85_0.25_128_/_0.07)] blur-[120px]" />
					<div className="absolute right-[10%] top-[10%] h-[500px] w-[500px] animate-[landing-mesh-2_25s_ease-in-out_infinite] rounded-full bg-[oklch(0.75_0.15_210_/_0.05)] blur-[100px]" />
					<div className="absolute bottom-[10%] left-[30%] h-[400px] w-[400px] animate-[landing-mesh-3_22s_ease-in-out_infinite] rounded-full bg-[oklch(0.80_0.12_60_/_0.06)] blur-[100px]" />
				</div>

				<div className="pointer-events-none absolute right-[5%] top-1/2 hidden -translate-y-1/2 lg:block">
					<div className="relative h-[480px] w-[480px] animate-[spin_80s_linear_infinite] rounded-full border border-dashed border-foreground/[0.08]">
						<div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.85_0.25_128)]" />
						<div className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground/20" />
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-7xl">
					<div className="max-w-3xl">
						<div className="mb-10 inline-flex animate-[landing-reveal_0.6s_ease_both] items-center gap-2.5 rounded-full border border-border/60 px-4 py-1.5">
							<span className="h-2 w-2 rounded-full bg-[oklch(0.85_0.25_128)]" />
							<span className="font-mono text-xs text-muted-foreground">
								{t('hero.badge')}
							</span>
						</div>

						<h1 className="animate-[landing-reveal_0.7s_0.1s_ease_both] font-display text-5xl font-semibold italic leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
							{t('hero.title')}
						</h1>

						<p className="mt-8 max-w-xl animate-[landing-reveal_0.7s_0.2s_ease_both] text-lg leading-relaxed text-muted-foreground sm:text-xl">
							{t('hero.subtitle')}
						</p>

						<div className="mt-12 flex animate-[landing-reveal_0.7s_0.3s_ease_both] items-center gap-6">
							<Link
								href="/signup"
								className="group inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-all hover:opacity-90"
							>
								{t('hero.cta')}
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
							</Link>
							<Link
								href="#features"
								className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
							>
								{t('nav.features')} &rarr;
							</Link>
						</div>

						<div className="mt-20 flex animate-[landing-reveal_0.7s_0.4s_ease_both] flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground/60">
							<span>Next.js 16</span>
							<span className="hidden h-3.5 w-px bg-border sm:block" />
							<span>React 19</span>
							<span className="hidden h-3.5 w-px bg-border sm:block" />
							<span>TypeScript 5</span>
							<span className="hidden h-3.5 w-px bg-border sm:block" />
							<span>Tailwind 4</span>
							<span className="hidden h-3.5 w-px bg-border sm:block" />
							<span>shadcn/ui</span>
						</div>
					</div>
				</div>
			</section>

			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="h-px bg-border" />
			</div>

			{/* Features — Bento Grid */}
			<section id="features" className="px-4 py-28 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 max-w-2xl">
						<span className="mb-4 block font-mono text-xs uppercase tracking-widest text-[oklch(0.85_0.25_128)]">
							{t('nav.features')}
						</span>
						<h2 className="font-display text-3xl font-semibold italic tracking-tight sm:text-4xl lg:text-5xl">
							{t('features.title')}
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							{t('features.subtitle')}
						</p>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{featureLayout.map(({ key, wide }, i) => {
							const Icon = featureIcons[key]
							return (
								<div
									key={key}
									className={`group relative overflow-hidden rounded-2xl border border-border/60 p-8 transition-all duration-300 hover:border-foreground/20 hover:shadow-lg ${wide ? 'lg:col-span-2' : ''}`}
								>
									<span className="absolute right-6 top-6 font-mono text-[80px] font-bold leading-none text-foreground/[0.03]">
										{String(i + 1).padStart(2, '0')}
									</span>
									<div className="relative">
										<div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/[0.05] text-foreground transition-colors group-hover:bg-[oklch(0.85_0.25_128_/_0.15)] group-hover:text-[oklch(0.45_0.2_128)] dark:group-hover:text-[oklch(0.85_0.25_128)]">
											<Icon className="h-5 w-5" />
										</div>
										<h3 className="mb-2 text-lg font-semibold">
											{t(`features.items.${key}.title`)}
										</h3>
										<p className="text-sm leading-relaxed text-muted-foreground">
											{t(`features.items.${key}.description`)}
										</p>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</section>

			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="h-px bg-border" />
			</div>

			{/* Pricing */}
			<section id="pricing" className="px-4 py-28 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 max-w-2xl">
						<span className="mb-4 block font-mono text-xs uppercase tracking-widest text-[oklch(0.85_0.25_128)]">
							{t('nav.pricing')}
						</span>
						<h2 className="font-display text-3xl font-semibold italic tracking-tight sm:text-4xl lg:text-5xl">
							{t('pricing.title')}
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							{t('pricing.subtitle')}
						</p>
					</div>

					<div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
						{planKeys.map((key) => {
							const features: string[] = t.raw(
								`pricing.plans.${key}.features`
							)
							const isPro = key === 'pro'
							return (
								<div
									key={key}
									className={`relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 ${isPro ? 'border-foreground/20 shadow-xl' : 'border-border/60 hover:border-foreground/20'}`}
								>
									{isPro && (
										<div className="absolute right-0 top-0 rounded-bl-xl bg-foreground px-4 py-1.5 font-mono text-xs text-background">
											{t('pricing.popular')}
										</div>
									)}
									<div className="mb-6">
										<h3 className="text-lg font-semibold">
											{t(`pricing.plans.${key}.name`)}
										</h3>
										<p className="mt-1 text-sm text-muted-foreground">
											{t(`pricing.plans.${key}.description`)}
										</p>
									</div>
									<div className="mb-8 flex items-baseline gap-1">
										<span className="font-display text-5xl font-semibold italic tracking-tight">
											{t(`pricing.plans.${key}.price`)}
										</span>
										<span className="text-sm text-muted-foreground">
											{t(`pricing.plans.${key}.period`)}
										</span>
									</div>
									<ul className="mb-8 flex flex-col gap-3">
										{features.map((feature) => (
											<li
												key={feature}
												className="flex items-center gap-2.5 text-sm"
											>
												<Check className="h-4 w-4 shrink-0 text-[oklch(0.85_0.25_128)]" />
												{feature}
											</li>
										))}
									</ul>
									<Link
										href="/signup"
										className={`inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ${isPro ? 'bg-foreground text-background hover:opacity-90' : 'border border-border bg-background hover:bg-muted'}`}
									>
										{t('hero.cta')}
									</Link>
								</div>
							)
						})}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="relative overflow-hidden px-4 py-32 sm:px-6 lg:px-8">
				<div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[oklch(0.85_0.25_128_/_0.04)] to-transparent" />
				<div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
					<h2 className="font-display text-4xl font-semibold italic tracking-tight sm:text-5xl lg:text-6xl">
						{t('cta.title')}
					</h2>
					<p className="max-w-xl text-lg text-muted-foreground">
						{t('cta.subtitle')}
					</p>
					<Link
						href="/signup"
						className="group inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-all hover:opacity-90"
					>
						{t('cta.button')}
						<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
					</Link>
				</div>
			</section>
		</div>
	)
}
