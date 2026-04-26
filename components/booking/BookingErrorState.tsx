'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { AlertCircle, Lock, SearchX, ServerCrash, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'

type IconComponent = React.ComponentType<{ className?: string }>

interface ErrorVariant {
	titleKey: string
	descriptionKey: string
	icon: IconComponent
}

const ERROR_VARIANTS: Record<string, ErrorVariant> = {
	notFound: {
		titleKey: 'bookingNotFoundTitle',
		descriptionKey: 'bookingNotFoundDescription',
		icon: SearchX,
	},
	unauthorized: {
		titleKey: 'orgForbiddenTitle',
		descriptionKey: 'orgForbiddenDescription',
		icon: Lock,
	},
	featureLocked: {
		titleKey: 'orgForbiddenTitle',
		descriptionKey: 'orgForbiddenDescription',
		icon: Lock,
	},
	serverError: {
		titleKey: 'bookingServerErrorTitle',
		descriptionKey: 'bookingServerErrorDescription',
		icon: ServerCrash,
	},
	network: {
		titleKey: 'title',
		descriptionKey: 'api.network',
		icon: WifiOff,
	},
}

const FALLBACK_VARIANT: ErrorVariant = {
	titleKey: 'bookingServerErrorTitle',
	descriptionKey: 'bookingServerErrorDescription',
	icon: AlertCircle,
}

const resolveVariant = (status: string | null): ErrorVariant => {
	if (!status) return FALLBACK_VARIANT
	return ERROR_VARIANTS[status] ?? FALLBACK_VARIANT
}

interface BookingErrorStateProps {
	status: string | null
}

function BookingErrorState({ status }: BookingErrorStateProps) {
	const t = useTranslations('errors')
	const locale = useLocale()
	const variant = resolveVariant(status)
	const Icon = variant.icon

	return (
		<div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
			<Empty className="max-w-md border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Icon className="size-5" />
					</EmptyMedia>
					<EmptyTitle className="text-base">{t(variant.titleKey)}</EmptyTitle>
					<EmptyDescription>{t(variant.descriptionKey)}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button
						variant="outline"
						nativeButton={false}
						render={<Link href={`/${locale}`} />}
					>
						{t('goHome')}
					</Button>
				</EmptyContent>
			</Empty>
		</div>
	)
}

export { BookingErrorState }
