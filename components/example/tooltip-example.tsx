"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function TooltipExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          Наведите на меня
        </TooltipTrigger>
        <TooltipContent>
          <p>Это подсказка с полезной информацией</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
