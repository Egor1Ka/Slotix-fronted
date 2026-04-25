'use client'

import { useEffect, useRef } from 'react'

interface ConfettiBurstProps {
	targetRef: React.RefObject<HTMLElement | null>
}

const prefersReducedMotion = (): boolean =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches

const fireBurst = async (origin: { x: number; y: number }) => {
	const confetti = (await import('canvas-confetti')).default
	const fire = (particleRatio: number, opts: object) => {
		confetti({
			origin,
			particleCount: Math.floor(140 * particleRatio),
			...opts,
		})
	}
	fire(0.25, { spread: 26, startVelocity: 55 })
	fire(0.2, { spread: 60 })
	fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 })
	fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
	fire(0.1, { spread: 120, startVelocity: 45 })
}

function ConfettiBurst({ targetRef }: ConfettiBurstProps) {
	const fired = useRef(false)
	useEffect(() => {
		if (fired.current) return
		fired.current = true
		if (prefersReducedMotion()) return
		const el = targetRef.current
		if (!el) return
		const rect = el.getBoundingClientRect()
		const origin = {
			x: (rect.left + rect.width / 2) / window.innerWidth,
			y: rect.top / window.innerHeight,
		}
		fireBurst(origin)
	}, [targetRef])
	return null
}

export { ConfettiBurst }
