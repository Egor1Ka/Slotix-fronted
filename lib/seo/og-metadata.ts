// lib/seo/og-metadata.ts
import type { Metadata } from 'next'

const DEFAULT_OG_IMAGE = '/og-default.png'

interface OgInput {
	title: string
	description: string
	image: string | null
	locale: string
	url?: string
}

const localeToOgLocale = (locale: string): string => {
	if (locale === 'uk') return 'uk_UA'
	return 'en_US'
}

export const buildOgMetadata = ({
	title,
	description,
	image,
	locale,
	url,
}: OgInput): Metadata => {
	const ogImage = image ?? DEFAULT_OG_IMAGE
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			images: [{ url: ogImage, width: 1200, height: 630 }],
			locale: localeToOgLocale(locale),
			type: 'website',
			url,
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: [ogImage],
		},
	}
}
