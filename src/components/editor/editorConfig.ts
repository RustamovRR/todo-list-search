import { InitialConfigType } from '@lexical/react/LexicalComposer'
import { editorTheme } from './themes/editor-theme'
import { nodes } from './nodes/nodes'

export const editorConfig: InitialConfigType = {
  namespace: 'Editor',
  theme: {
    ...editorTheme,
    paragraph: 'relative m-0 text-justify w-full',
    text: {
      ...editorTheme.text,
      base: 'whitespace-normal break-words leading-relaxed text-justify hyphens-auto w-full',
    },
  },
  nodes,
  onError: (error: Error) => {
    console.error('❌ Editor Error:', error)
  },
}
