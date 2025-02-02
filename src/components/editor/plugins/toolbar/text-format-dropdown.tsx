// text-format-dropdown.tsx
import { Select, SelectContent, SelectGroup, SelectTrigger } from '@/components/ui/select'

export function TextFormatDropDown({ children }: { children: React.ReactNode }) {
  return (
    <Select value={''}>
      <SelectTrigger className="h-8 w-min gap-1">
        <span>Insert</span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>{children}</SelectGroup>
      </SelectContent>
    </Select>
  )
}
