'use client'

import { useState, useMemo } from 'react'
import {
	Combobox,
	ComboboxInput,
	ComboboxContent,
	ComboboxList,
	ComboboxItem,
	ComboboxGroup,
	ComboboxLabel,
	ComboboxSeparator,
	ComboboxChips,
	ComboboxChip,
	ComboboxChipsInput,
	useComboboxAnchor,
} from '@/components/ui/combobox'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const frameworks = [
	{ value: 'react', label: 'React' },
	{ value: 'vue', label: 'Vue' },
	{ value: 'angular', label: 'Angular' },
	{ value: 'svelte', label: 'Svelte' },
	{ value: 'nextjs', label: 'Next.js' },
]

const frontendFrameworks = [
	{ value: 'react', label: 'React' },
	{ value: 'vue', label: 'Vue' },
	{ value: 'svelte', label: 'Svelte' },
]

const backendFrameworks = [
	{ value: 'nodejs', label: 'Node.js' },
	{ value: 'django', label: 'Django' },
	{ value: 'rails', label: 'Rails' },
]

const languages = [
	{ value: 'javascript', label: 'JavaScript' },
	{ value: 'typescript', label: 'TypeScript' },
	{ value: 'python', label: 'Python' },
	{ value: 'rust', label: 'Rust' },
	{ value: 'go', label: 'Go' },
	{ value: 'java', label: 'Java' },
	{ value: 'csharp', label: 'C#' },
	{ value: 'ruby', label: 'Ruby' },
]

function BasicCombobox() {
	const [value, setValue] = useState<string | null>(null)
	const [inputValue, setInputValue] = useState('')

	const filtered = useMemo(
		() =>
			frameworks.filter((f) =>
				f.label.toLowerCase().includes(inputValue.toLowerCase()),
			),
		[inputValue],
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Базовый Combobox</CardTitle>
				<CardDescription>
					Простой поиск и выбор из списка фреймворков
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Combobox
					value={value}
					onValueChange={setValue}
					onInputValueChange={setInputValue}
				>
					<ComboboxInput placeholder="Выберите фреймворк..." showClear />
					<ComboboxContent>
						<ComboboxList>
							{filtered.length === 0 ? (
								<div className="text-muted-foreground py-4 text-center text-sm">
									Ничего не найдено
								</div>
							) : (
								filtered.map((framework) => (
									<ComboboxItem key={framework.value} value={framework.value}>
										{framework.label}
									</ComboboxItem>
								))
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
				{value && (
					<p className="text-muted-foreground mt-3 text-sm">
						Выбрано:{' '}
						<span className="text-foreground font-medium">
							{frameworks.find((f) => f.value === value)?.label}
						</span>
					</p>
				)}
			</CardContent>
		</Card>
	)
}

function GroupedCombobox() {
	const [value, setValue] = useState<string | null>(null)
	const [inputValue, setInputValue] = useState('')

	const allItems = [...frontendFrameworks, ...backendFrameworks]
	const query = inputValue.toLowerCase()

	const filteredFrontend = useMemo(
		() =>
			frontendFrameworks.filter((f) => f.label.toLowerCase().includes(query)),
		[query],
	)
	const filteredBackend = useMemo(
		() =>
			backendFrameworks.filter((f) => f.label.toLowerCase().includes(query)),
		[query],
	)
	const hasResults = filteredFrontend.length > 0 || filteredBackend.length > 0

	return (
		<Card>
			<CardHeader>
				<CardTitle>Combobox с группами</CardTitle>
				<CardDescription>
					Элементы сгруппированы по категориям: Frontend и Backend
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Combobox
					value={value}
					onValueChange={setValue}
					onInputValueChange={setInputValue}
				>
					<ComboboxInput placeholder="Выберите технологию..." showClear />
					<ComboboxContent>
						<ComboboxList>
							{!hasResults ? (
								<div className="text-muted-foreground py-4 text-center text-sm">
									Ничего не найдено
								</div>
							) : (
								<>
									{filteredFrontend.length > 0 && (
										<ComboboxGroup>
											<ComboboxLabel>Frontend</ComboboxLabel>
											{filteredFrontend.map((item) => (
												<ComboboxItem key={item.value} value={item.value}>
													{item.label}
												</ComboboxItem>
											))}
										</ComboboxGroup>
									)}
									{filteredFrontend.length > 0 &&
										filteredBackend.length > 0 && <ComboboxSeparator />}
									{filteredBackend.length > 0 && (
										<ComboboxGroup>
											<ComboboxLabel>Backend</ComboboxLabel>
											{filteredBackend.map((item) => (
												<ComboboxItem key={item.value} value={item.value}>
													{item.label}
												</ComboboxItem>
											))}
										</ComboboxGroup>
									)}
								</>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
				{value && (
					<p className="text-muted-foreground mt-3 text-sm">
						Выбрано:{' '}
						<span className="text-foreground font-medium">
							{allItems.find((f) => f.value === value)?.label}
						</span>
					</p>
				)}
			</CardContent>
		</Card>
	)
}

function MultiSelectCombobox() {
	const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
	const [inputValue, setInputValue] = useState('')
	const chipsRef = useComboboxAnchor()

	const filtered = useMemo(
		() =>
			languages.filter((l) =>
				l.label.toLowerCase().includes(inputValue.toLowerCase()),
			),
		[inputValue],
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Мультивыбор с чипами</CardTitle>
				<CardDescription>
					Выберите несколько языков программирования
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Combobox
					multiple
					value={selectedLanguages}
					onValueChange={setSelectedLanguages}
					onInputValueChange={setInputValue}
				>
					<ComboboxChips ref={chipsRef}>
						{selectedLanguages.map((lang) => (
							<ComboboxChip key={lang}>
								{languages.find((l) => l.value === lang)?.label}
							</ComboboxChip>
						))}
						<ComboboxChipsInput placeholder="Добавить язык..." />
					</ComboboxChips>
					<ComboboxContent anchor={chipsRef}>
						<ComboboxList>
							{filtered.length === 0 ? (
								<div className="text-muted-foreground py-4 text-center text-sm">
									Ничего не найдено
								</div>
							) : (
								filtered.map((language) => (
									<ComboboxItem key={language.value} value={language.value}>
										{language.label}
									</ComboboxItem>
								))
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
				{selectedLanguages.length > 0 && (
					<p className="text-muted-foreground mt-3 text-sm">
						Выбрано ({selectedLanguages.length}):{' '}
						<span className="text-foreground font-medium">
							{selectedLanguages
								.map((lang) => languages.find((l) => l.value === lang)?.label)
								.join(', ')}
						</span>
					</p>
				)}
			</CardContent>
		</Card>
	)
}

export default function ComboboxDemoPage() {
	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">Combobox</h1>
				<p className="text-muted-foreground">
					Автозаполнение с поиском и выпадающим списком на базе Base UI.
				</p>
			</div>
			<Separator />
			<BasicCombobox />
			<GroupedCombobox />
			<MultiSelectCombobox />
		</div>
	)
}
