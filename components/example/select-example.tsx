'use client'

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

export default function SelectExample() {
	return (
		<Select>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Выберите фрукт" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Фрукты</SelectLabel>
					<SelectItem value="apple">Яблоко</SelectItem>
					<SelectItem value="banana">Банан</SelectItem>
					<SelectItem value="orange">Апельсин</SelectItem>
					<SelectItem value="grape">Виноград</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	)
}
