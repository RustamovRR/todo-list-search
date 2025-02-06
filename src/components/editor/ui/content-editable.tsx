import { ContentEditable as LexicalContentEditable } from '@lexical/react/LexicalContentEditable'
import { JSX } from 'react'

type Props = {
  placeholder: string
  className?: string
  placeholderClassName?: string
}

export function ContentEditable({ placeholder, className, placeholderClassName }: Props): JSX.Element {
  return (
    <LexicalContentEditable
      className={
        className ??
        `ContentEditable__root relative block h-[calc(100vh-18rem)] overflow-auto p-4 focus:outline-none`
      }
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
