'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ForbiddenPage() {
	const t = useTranslations('errors')

	return (
		<div className="bg-background flex min-h-screen flex-col items-center justify-center px-6">
			<div className="flex max-w-md flex-col items-center gap-6 text-center">
				<ShieldX className="text-destructive h-16 w-16" />
				<div className="flex flex-col gap-2">
					<h1 className="text-foreground text-2xl font-semibold">
						{t('orgForbiddenTitle')}
					</h1>
					<p className="text-muted-foreground">
						{t('orgForbiddenDescription')}
					</p>
				</div>
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link href="/organizations" />}
				>
					{t('orgForbiddenBack')}
				</Button>
			</div>
		</div>
	)
}
