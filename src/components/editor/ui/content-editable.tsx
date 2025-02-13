import { ContentEditable as LexicalContentEditable } from '@lexical/react/LexicalContentEditable'
import { JSX } from 'react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/store/editor-store'

type Props = {
  placeholder: string
  className?: string
  placeholderClassName?: string
}

export function ContentEditable({ placeholder, className, placeholderClassName }: Props): JSX.Element {
  const partsCount = useEditorStore((state) => state.partsCount)
  return (
    <LexicalContentEditable
      className={cn(
        'ContentEditable__root relative block overflow-auto p-4 focus:outline-none',
        partsCount >= 1
          ? 'h-[calc(100vh-20rem)]'
          : partsCount >= 5
            ? 'h-[calc(100vh-22.5rem)]'
            : 'h-[calc(100vh-16.5rem)]',
        className,
      )}
      aria-placeholder={placeholder}
      placeholder={
        <div
          className={
            placeholderClassName ??
            `pointer-events-none absolute left-0 top-0 select-none overflow-hidden text-ellipsis p-4 text-muted-foreground`
          }
        >
          {placeholder}
        </div>
      }
    />
  )
}
