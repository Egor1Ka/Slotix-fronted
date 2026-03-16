import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"

export default function NativeSelectExample() {
  return (
    <NativeSelect defaultValue="">
      <NativeSelectOption value="" disabled>
        Выберите фреймворк
      </NativeSelectOption>
      <NativeSelectOption value="react">React</NativeSelectOption>
      <NativeSelectOption value="vue">Vue</NativeSelectOption>
      <NativeSelectOption value="svelte">Svelte</NativeSelectOption>
      <NativeSelectOption value="angular">Angular</NativeSelectOption>
    </NativeSelect>
  )
}
