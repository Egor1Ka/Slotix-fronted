'use client'

import { useEffect, useState } from 'react'

type HeroVideoProps = {
	poster?: string
	webm?: string
	mp4?: string
	className?: string
}

function HeroVideo({
	poster,
	webm,
	mp4 = '/video/slotix-demo.mp4',
	className,
}: HeroVideoProps) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
	}, [])

	if (!mounted) {
		return (
			<div
				aria-hidden="true"
				className={className}
				style={{
					backgroundImage: poster ? `url(${poster})` : undefined,
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					backgroundColor: '#000',
				}}
			/>
		)
	}

	return (
		<video
			autoPlay
			muted
			loop
			playsInline
			preload="auto"
			poster={poster}
			className={className}
			suppressHydrationWarning
		>
			{webm && <source src={webm} type="video/webm" />}
			<source src={mp4} type="video/mp4" />
		</video>
	)
}

export { HeroVideo }
