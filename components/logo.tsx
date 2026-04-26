import Link from 'next/link'
import { cn } from '@/lib/utils'

type LogoMarkProps = {
	size?: number
	className?: string
}

function LogoMark({ size = 32, className }: LogoMarkProps) {
	return (
		<span
			data-slot="logo-mark"
			className={cn(
				'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[0.45em] bg-neutral-950 font-black text-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.25)] ring-1 ring-white/10 dark:bg-neutral-950 dark:ring-white/10',
				className,
			)}
			style={{ width: size, height: size, fontSize: size }}
			aria-hidden="true"
		>
			<span
				data-slot="logo-mark-glow"
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,oklch(0.72_0.18_145_/_0.85)_0%,transparent_55%)]"
			/>
			<span
				data-slot="logo-mark-shine"
				className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_40%)]"
			/>
			<span
				data-slot="logo-mark-letter"
				className="relative leading-none"
				style={{ fontSize: '0.6em' }}
			>
				S
			</span>
		</span>
	)
}

type LogoProps = {
	size?: 'sm' | 'md' | 'lg'
	href?: string
	label?: string
	className?: string
	textClassName?: string
}

const SIZE_MAP: Record<
	NonNullable<LogoProps['size']>,
	{ mark: number; text: string; gap: string }
> = {
	sm: { mark: 24, text: 'text-base', gap: 'gap-2' },
	md: { mark: 32, text: 'text-xl', gap: 'gap-2.5' },
	lg: { mark: 44, text: 'text-2xl', gap: 'gap-3' },
}

function Logo({
	size = 'md',
	href,
	label = 'Slotix',
	className,
	textClassName,
}: LogoProps) {
	const { mark, text, gap } = SIZE_MAP[size]

	const content = (
		<span
			data-slot="logo"
			className={cn(
				'inline-flex items-center font-bold tracking-tight',
				gap,
				className,
			)}
		>
			<LogoMark size={mark} />
			<span className={cn('text-foreground', text, textClassName)}>
				{label}
			</span>
		</span>
	)

	if (href) {
		return (
			<Link href={href} aria-label={label} className="group inline-flex">
				{content}
			</Link>
		)
	}
	return content
}

export { Logo, LogoMark }
