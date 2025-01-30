'use client'

import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { $getRoot, EditorState, SerializedEditorState } from 'lexical'

import { TooltipProvider } from '@/components/ui/tooltip'

import { FloatingLinkContext } from './context/floating-link-context'
import { SharedAutocompleteContext } from './context/shared-autocomplete-context'
import { nodes } from './nodes/nodes'
import { Plugins } from './plugins/plugins'
import { editorTheme } from './themes/editor-theme'
import { useCallback, useState } from 'react'
import { debounce } from 'lodash-es'
import { toast } from 'sonner'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import dynamic from 'next/dynamic'

interface Document {
  id?: string
  title: string
  content: string
}

const editorConfig: InitialConfigType = {
  namespace: 'Editor',
  theme: editorTheme,
  nodes,
  onError: (error: Error) => {
    console.error(error)
  },
}

const Editor = ({
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
}: {
  editorState?: EditorState
  editorSerializedState?: SerializedEditorState
  onChange?: (editorState: EditorState) => void
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void
}) => {
  const [document, setDocument] = useState<Document>({
    title: '',
    content: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const debouncedSave = useCallback(
    debounce(async (doc: Document) => {
      try {
        setIsSaving(true)
        const url = doc.id ? `/api/documents/${doc.id}` : '/api/documents'

        const method = doc.id ? 'PUT' : 'POST'

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(doc),
        })

        if (!response.ok) {
          throw new Error('Failed to save')
        }

        const result = await response.json()

        if (!doc.id) {
          setDocument((prev) => ({ ...prev, id: result.id }))
        }

        toast.success('Saved successfully')
      } catch (error) {
        console.error('Save error:', error)
        toast.error('Failed to save')
      } finally {
        setIsSaving(false)
      }
    }, 1000),
    [],
  )

  const handleChange = useCallback(
    (editorState: any) => {
      editorState.read(() => {
        const content = $getRoot().getTextContent()
        setDocument((prev) => ({ ...prev, content }))
        debouncedSave({ ...document, content })
      })
    },
    [document, debouncedSave],
  )

  return (
    <div className="m-4 overflow-hidden h-full rounded-lg border bg-background shadow">
      <Input
        value={document.title}
        onChange={(e) => {
          const title = e.target.value
          setDocument((prev) => ({ ...prev, title }))
          debouncedSave({ ...document, title })
        }}
        placeholder="Enter title..."
        className="mb-4"
      />

      <LexicalComposer
        initialConfig={{
          ...editorConfig,
          ...(editorState ? { editorState } : {}),
          ...(editorSerializedState ? { editorState: JSON.stringify(editorSerializedState) } : {}),
        }}
      >
        <TooltipProvider>
          <SharedAutocompleteContext>
            <FloatingLinkContext>
              <Plugins />

              <OnChangePlugin ignoreSelectionChange={true} onChange={handleChange} />
            </FloatingLinkContext>
          </SharedAutocompleteContext>
        </TooltipProvider>
      </LexicalComposer>

      <div className="flex items-center gap-2 mt-4">
        <Button variant="outline" onClick={() => debouncedSave(document)} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export default Editor
