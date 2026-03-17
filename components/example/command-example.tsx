'use client'

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command'
import { Calculator, Smile, CreditCard, User, Settings } from 'lucide-react'

export default function CommandExample() {
	return (
		<Command className="max-w-sm rounded-lg border shadow-md">
			<CommandInput placeholder="Введите команду..." />
			<CommandList>
				<CommandEmpty>Ничего не найдено.</CommandEmpty>
				<CommandGroup heading="Предложения">
					<CommandItem>
						<Calculator />
						<span>Калькулятор</span>
					</CommandItem>
					<CommandItem>
						<Smile />
						<span>Эмодзи</span>
					</CommandItem>
					<CommandItem>
						<CreditCard />
						<span>Оплата</span>
					</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Настройки">
					<CommandItem>
						<User />
						<span>Профиль</span>
					</CommandItem>
					<CommandItem>
						<Settings />
						<span>Настройки</span>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</Command>
	)
}
