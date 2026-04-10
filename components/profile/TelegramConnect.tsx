'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { userApi } from '@/services'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface TelegramConnectProps {
	connected: boolean
	onStatusChange: (connected: boolean) => void
}

function TelegramConnect({ connected, onStatusChange }: TelegramConnectProps) {
	const t = useTranslations('profile.telegram')
	const [loading, setLoading] = useState(false)
	const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false)
	const [showCheckStatus, setShowCheckStatus] = useState(false)

	const handleConnect = async () => {
		setLoading(true)
		try {
			const response = await userApi.connectTelegram()
			const url = response.data?.url
			if (!url) return

			const opened = window.open(url, '_blank')
			if (opened) {
				toast.info(t('linkOpened'))
			} else {
				toast.info(t('popupBlocked'), { description: url, duration: 15000 })
			}
			setShowCheckStatus(true)
		} catch {
			// toast interceptor handles errors
		} finally {
			setLoading(false)
		}
	}

	const handleCheckStatus = async () => {
		setLoading(true)
		try {
			const response = await userApi.me()
			const isConnected = response.data.telegramConnected
			onStatusChange(isConnected)
			if (isConnected) {
				toast.success(t('nowConnected'))
				setShowCheckStatus(false)
			}
		} catch {
			// toast interceptor handles errors
		} finally {
			setLoading(false)
		}
	}

	const handleDisconnect = async () => {
		setLoading(true)
		setShowConfirmDisconnect(false)
		try {
			await userApi.disconnectTelegram()
			onStatusChange(false)
			toast.success(t('disconnected'))
		} catch {
			// toast interceptor handles errors
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-lg">{t('title')}</CardTitle>
							<CardDescription>{t('description')}</CardDescription>
						</div>
						<Badge variant={connected ? 'default' : 'secondary'}>
							{connected ? t('connected') : t('notConnected')}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="flex gap-2">
					{connected ? (
						<Button
							variant="outline"
							onClick={() => setShowConfirmDisconnect(true)}
							disabled={loading}
						>
							{loading ? t('disconnecting') : t('disconnect')}
						</Button>
					) : (
						<>
							<Button onClick={handleConnect} disabled={loading}>
								{loading && !showCheckStatus
									? t('connecting')
									: t('connect')}
							</Button>
							{showCheckStatus && (
								<Button
									variant="outline"
									onClick={handleCheckStatus}
									disabled={loading}
								>
									{loading ? t('checking') : t('checkStatus')}
								</Button>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<AlertDialog
				open={showConfirmDisconnect}
				onOpenChange={setShowConfirmDisconnect}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t('confirmDisconnectTitle')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t('confirmDisconnectDescription')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							{t('confirmDisconnectCancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleDisconnect}
						>
							{t('confirmDisconnectAction')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export { TelegramConnect }
