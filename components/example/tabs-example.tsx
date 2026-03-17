'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function TabsExample() {
	return (
		<Tabs defaultValue="account" className="w-[400px]">
			<TabsList>
				<TabsTrigger value="account">Аккаунт</TabsTrigger>
				<TabsTrigger value="password">Пароль</TabsTrigger>
			</TabsList>
			<TabsContent value="account">
				<div className="flex flex-col gap-4 pt-4">
					<p className="text-muted-foreground text-sm">
						Управляйте настройками вашего аккаунта.
					</p>
					<div className="grid gap-1.5">
						<Label htmlFor="tab-name">Имя</Label>
						<Input id="tab-name" defaultValue="Иван Иванов" />
					</div>
				</div>
			</TabsContent>
			<TabsContent value="password">
				<div className="flex flex-col gap-4 pt-4">
					<p className="text-muted-foreground text-sm">
						Измените пароль для вашего аккаунта.
					</p>
					<div className="grid gap-1.5">
						<Label htmlFor="tab-password">Новый пароль</Label>
						<Input id="tab-password" type="password" />
					</div>
				</div>
			</TabsContent>
		</Tabs>
	)
}
