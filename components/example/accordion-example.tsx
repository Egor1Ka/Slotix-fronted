"use client"

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

export default function AccordionExample() {
  return (
    <div className="w-full max-w-md space-y-4">
      <h3 className="text-lg font-medium">Аккордеон</h3>
      <Accordion>
        <AccordionItem value="item-1">
          <AccordionTrigger>Что такое React?</AccordionTrigger>
          <AccordionContent>
            React — это библиотека JavaScript для создания пользовательских
            интерфейсов. Она позволяет создавать сложные UI из небольших
            изолированных компонентов.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Как установить зависимости?</AccordionTrigger>
          <AccordionContent>
            Для установки зависимостей используйте команду npm install или yarn
            install в корневой директории проекта.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Можно ли использовать TypeScript?</AccordionTrigger>
          <AccordionContent>
            Да, проект полностью поддерживает TypeScript. Все компоненты
            типизированы и обеспечивают автодополнение в редакторе.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
