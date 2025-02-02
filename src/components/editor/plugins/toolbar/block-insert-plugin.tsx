import { PlusIcon } from 'lucide-react'

import { Select, SelectContent, SelectGroup, SelectTrigger } from '@/components/ui/select'

export function BlockInsertPlugin({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Select value={''}>
        <SelectTrigger className="h-8 w-min gap-1">
          <PlusIcon className="size-4" />
          <span>Insert</span>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>{children}</SelectGroup>
        </SelectContent>
      </Select>
    </>
  )
}
