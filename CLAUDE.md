# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Use this project as a **reference template** when building new frontend projects.

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint (flat config, ESLint 9)

## Tech Stack

| Layer        | Technology                                  | Version |
| ------------ | ------------------------------------------- | ------- |
| Framework    | Next.js (App Router)                        | 16      |
| UI Library   | React                                       | 19      |
| Language     | TypeScript (strict mode)                    | 5       |
| Styling      | Tailwind CSS via PostCSS (`@tailwindcss/postcss`) | 4       |
| Components   | shadcn/ui (style: `base-nova`)              | 4       |
| Primitives   | `@base-ui/react` (headless)                 | 1.3     |
| Icons        | `lucide-react`                              | 0.577   |
| Forms        | `react-hook-form` + `@hookform/resolvers`   | 7.71    |
| Validation   | `zod`                                       | 4       |
| Toasts       | `sonner`                                    | 2       |
| Charts       | `recharts`                                  | 2.15    |
| Themes       | `next-themes` (dark mode via `.dark` class) | 0.4     |

## Project Structure

```
├── app/                        # Next.js App Router (routes, layouts, pages)
│   ├── layout.tsx              # Root layout: Geist fonts, global CSS
│   ├── page.tsx                # Home page
│   ├── globals.css             # Tailwind imports + CSS theme variables (oklch)
│   └── [route]/                # Route segments (layout.tsx + page.tsx)
│
├── components/
│   ├── ui/                     # shadcn/ui components (54 components)
│   └── example/                # Usage examples for each UI component
│
├── hooks/                      # Custom React hooks
│   └── use-mobile.ts           # useIsMobile() — viewport < 768px detection
│
├── lib/
│   └── utils.ts                # cn() — clsx + tailwind-merge utility
│
├── public/                     # Static assets (SVGs, favicon)
│
├── components.json             # shadcn/ui configuration
├── tsconfig.json               # TypeScript config (path alias @/*)
├── postcss.config.mjs          # PostCSS with @tailwindcss/postcss
├── eslint.config.mjs           # ESLint 9 flat config
└── next.config.ts              # Next.js config (minimal)
```

## Architecture Details

### Routing (App Router)

All routes live in `app/`. Each route segment is a folder containing `page.tsx` (the page) and optionally `layout.tsx` (shared layout wrapper). Layouts are nested — child routes inherit parent layouts.

```
app/
├── layout.tsx          # Root layout (fonts, <html>, <body>)
├── page.tsx            # /
└── dashboard/
    ├── layout.tsx      # Shared layout for /dashboard/*
    ├── page.tsx        # /dashboard
    └── settings/
        └── page.tsx    # /dashboard/settings
```

### Path Alias

`@/*` maps to the project root. Always use it for imports:

```tsx
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
```

### Styling System

**Tailwind CSS 4** with CSS custom properties for theming. All theme tokens are defined in `app/globals.css` using oklch color space.

Key CSS variables (available in both light and dark themes):
- `--background`, `--foreground` — page background/text
- `--primary`, `--primary-foreground` — primary action color
- `--secondary`, `--secondary-foreground` — secondary color
- `--muted`, `--muted-foreground` — subdued content
- `--destructive` — error/danger color
- `--card`, `--card-foreground` — card surfaces
- `--popover`, `--popover-foreground` — floating surfaces
- `--border`, `--input`, `--ring` — borders and focus rings
- `--radius` — base border radius (scales: `--radius-sm` through `--radius-4xl`)
- `--chart-1` through `--chart-5` — chart palette
- `--sidebar-*` — sidebar-specific tokens

Dark mode is toggled by adding `.dark` class to a parent element. The variant is defined as `@custom-variant dark (&:is(.dark *))`.

### Fonts

Geist Sans (`--font-geist-sans`) and Geist Mono (`--font-geist-mono`) loaded via `next/font/google` in the root layout. Applied as CSS variables on `<body>`.

## Component Patterns

### shadcn/ui Components (`components/ui/`)

All 54 UI components follow these conventions:

1. **Function declarations** (not arrow functions) for component definitions
2. **`data-slot` attribute** on every component root for CSS targeting
3. **`cn()` utility** for merging Tailwind classes with user overrides
4. **Spread `...props`** to allow full customization
5. **No inline comments** — code relies on clear naming
6. **Named exports** (not default exports) for all components

Example pattern:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function ComponentName({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="component-name"
      className={cn("tailwind-classes-here", className)}
      {...props}
    />
  )
}

export { ComponentName }
```

### Components with Variants (CVA)

Components with multiple visual variants use `class-variance-authority`:

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "...",
      outline: "...",
      ghost: "...",
    },
    size: {
      default: "...",
      sm: "...",
      lg: "...",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

### Headless Primitives (@base-ui/react)

Many components wrap `@base-ui/react` primitives for built-in accessibility:

```tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
```

This gives components proper ARIA attributes, keyboard navigation, and focus management out of the box.

### Compound Components

Complex UI elements use the compound component pattern with separate sub-components:

```tsx
// Card with sub-components
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer actions</CardFooter>
</Card>

// Field with sub-components (form fields)
<Field data-invalid={!!errors.name || undefined}>
  <FieldLabel htmlFor="name">Name</FieldLabel>
  <FieldDescription>Helper text</FieldDescription>
  <Input id="name" {...register("name")} />
  <FieldError errors={[errors.name]} />
</Field>
```

## Form Handling Pattern

Forms use `react-hook-form` + `zod` for type-safe validation:

```tsx
"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

// 1. Define schema
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email"),
  role: z.string().min(1, "Select a role"),
})

type FormData = z.infer<typeof schema>

// 2. Setup form
const { register, handleSubmit, control, formState: { errors }, reset } = useForm<FormData>({
  resolver: zodResolver(schema),
})

// 3. Handle submit
const onSubmit = (data: FormData) => {
  toast.success("Success!", { description: `Welcome, ${data.name}` })
  reset()
}

// 4. Render with Field components
<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
  {/* Simple inputs — use register() */}
  <Field data-invalid={!!errors.name || undefined}>
    <FieldLabel htmlFor="name">Name</FieldLabel>
    <Input id="name" {...register("name")} />
    <FieldError errors={[errors.name]} />
  </Field>

  {/* Custom components (Select, Switch, Checkbox) — use Controller */}
  <Field data-invalid={!!errors.role || undefined}>
    <FieldLabel>Role</FieldLabel>
    <Controller
      control={control}
      name="role"
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dev">Developer</SelectItem>
          </SelectContent>
        </Select>
      )}
    />
    <FieldError errors={[errors.role]} />
  </Field>

  <Button type="submit">Submit</Button>
</form>
```

Key rules:
- Use `register()` for native inputs (Input, Textarea, NativeSelect)
- Use `Controller` for custom components (Select, Switch, Checkbox, RadioGroup)
- Set `data-invalid={!!errors.field || undefined}` on Field to trigger error styling
- Pass `errors={[errors.field]}` to FieldError for automatic error display
- Horizontal fields (Switch, Checkbox): use `<Field orientation="horizontal">`

## Adding New shadcn Components

Use the shadcn CLI. The config is in `components.json`:

```bash
npx shadcn@latest add [component-name]
```

Components will be placed in `components/ui/` and follow the `base-nova` style with `@base-ui/react` primitives.

## Available UI Components Reference

**Layout:** Card, Separator, Resizable, AspectRatio, ScrollArea, Sidebar
**Navigation:** Breadcrumb, NavigationMenu, Pagination, Tabs, Menubar
**Forms:** Input, Textarea, Select, NativeSelect, Checkbox, RadioGroup, Switch, Slider, Toggle, ToggleGroup, Calendar, Combobox, InputOTP, InputGroup, Field (with FieldLabel, FieldDescription, FieldError, FieldContent)
**Feedback:** Alert, AlertDialog, Dialog, Drawer, Sheet, Sonner (toast), Progress, Skeleton, Spinner, Empty
**Data Display:** Table, Badge, Avatar, HoverCard, Tooltip, Kbd, Item
**Actions:** Button, ButtonGroup, DropdownMenu, ContextMenu, Command, Popover
**Media:** Carousel, Chart
**Overlay:** Collapsible, Accordion

## Client vs Server Components

By default, components in `app/` are **React Server Components**. Add `"use client"` directive at the top of files that need:
- React hooks (`useState`, `useEffect`, `useForm`, etc.)
- Event handlers (`onClick`, `onSubmit`, etc.)
- Browser APIs (`window`, `document`, etc.)
- Third-party client libraries (`sonner`, `react-hook-form`, etc.)

UI components in `components/ui/` that use `@base-ui/react` primitives or interactivity already have `"use client"` where needed.

## Key Utility: cn()

Located in `lib/utils.ts`. Always use it for className composition:

```tsx
import { cn } from "@/lib/utils"

// Merges classes and resolves Tailwind conflicts
cn("px-4 py-2", "px-6")           // → "px-6 py-2"
cn("text-red-500", className)      // → allows overrides from props
cn(condition && "hidden")          // → conditional classes
```

## ESLint Configuration

ESLint 9 flat config in `eslint.config.mjs`:
- Extends `next/core-web-vitals` and `next/typescript`
- Ignores `.next/`, `out/`, `build/`, `next-env.d.ts`
