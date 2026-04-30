'use client'

import { useId } from 'react'
import { Pipette } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_COLOR_PALETTE = [
	'#8B5CF6',
	'#06B6D4',
	'#F59E0B',
	'#EF4444',
	'#10B981',
	'#3B82F6',
	'#EC4899',
	'#F97316',
] as const

const SIZE_CLASS = {
	sm: 'size-6',
	md: 'size-7',
} as const

const ICON_SIZE_CLASS = {
	sm: 'size-3.5',
	md: 'size-4',
} as const

interface ColorPickerProps {
	value: string
	onChange: (color: string) => void
	presets?: readonly string[]
	size?: 'sm' | 'md'
	className?: string
	disabled?: boolean
	id?: string
}

function ColorPicker({
	value,
	onChange,
	presets = DEFAULT_COLOR_PALETTE,
	size = 'md',
	className,
	disabled,
	id,
}: ColorPickerProps) {
	const fallbackId = useId()
	const inputId = id ?? fallbackId
	const hasValue = !!value
	const isCustom = hasValue && !presets.includes(value)

	const selectPreset = (color: string) => () => onChange(color)
	const isSelected = (color: string) => color === value

	const handlePickerInput = (event: React.ChangeEvent<HTMLInputElement>) =>
		onChange(event.target.value.toUpperCase())

	const renderPreset = (color: string) => (
		<button
			key={color}
			type="button"
			aria-label={color}
			disabled={disabled}
			onClick={selectPreset(color)}
			className={cn(
				SIZE_CLASS[size],
				'rounded-full border-2 transition-transform',
				isSelected(color)
					? 'border-foreground scale-110'
					: 'border-transparent hover:border-muted-foreground',
				disabled && 'cursor-not-allowed opacity-50',
			)}
			style={{ backgroundColor: color }}
		/>
	)

	const renderCustomSwatch = () => (
		<span
			aria-label={value}
			className={cn(
				SIZE_CLASS[size],
				'rounded-full border-2 border-foreground scale-110',
			)}
			style={{ backgroundColor: value }}
		/>
	)

	return (
		<div
			data-slot="color-picker"
			className={cn('flex flex-wrap items-center gap-2', className)}
		>
			{presets.map(renderPreset)}

			{isCustom && renderCustomSwatch()}

			<label
				htmlFor={inputId}
				aria-label="Pick custom color"
				className={cn(
					SIZE_CLASS[size],
					'flex items-center justify-center rounded-full',
					'border border-dashed border-border',
					'hover:border-foreground transition-colors cursor-pointer',
					disabled && 'pointer-events-none cursor-not-allowed opacity-50',
				)}
			>
				<Pipette
					className={cn(ICON_SIZE_CLASS[size], 'text-muted-foreground')}
				/>
				<input
					id={inputId}
					type="color"
					value={isCustom ? value : presets[0]}
					onChange={handlePickerInput}
					disabled={disabled}
					className="sr-only"
				/>
			</label>
		</div>
	)
}

export { ColorPicker, DEFAULT_COLOR_PALETTE }
