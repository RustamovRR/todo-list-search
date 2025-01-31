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
import { documentDB } from '@/lib/dib'

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
}: {
  editorState?: EditorState
  editorSerializedState?: SerializedEditorState
}) => {
  const [documentFile, setDocumentFile] = useState<Document>({
    title: '',
    content: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Save document
  const saveDocument = async (doc: Document) => {
    if (!doc.title.trim() || !doc.content.trim()) {
      return
    }

    try {
      setIsSaving(true)

      const savedDoc = doc.id ? await documentDB.updateDocument(doc.id, doc) : await documentDB.createDocument(doc)

      setDocumentFile((prev) => ({ ...prev, id: savedDoc.id }))
      toast.success('Saved successfully')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save document')
    } finally {
      setIsSaving(false)
    }
  }

  // Debounced save
  const debouncedSave = useCallback(
    debounce((doc: Document) => saveDocument(doc), 1000),
    [],
  )

  // Editor changes
  const handleEditorChange = useCallback(
    (editorState: any) => {
      editorState.read(() => {
        const content = $getRoot().getTextContent()
        setDocumentFile((prev) => {
          const newDoc = { ...prev, content }
          debouncedSave(newDoc)
          return newDoc
        })
      })
    },
    [debouncedSave],
  )

  // Export as .doc file
  const exportAsDoc = async () => {
    try {
      const { Document, Paragraph, Packer } = await import('docx')

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: documentFile.content,
              }),
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${document.title || 'document'}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export document')
    }
  }

  return (
    <div className="m-4 overflow-hidden h-full rounded-lg border bg-background shadow">
      <Input
        value={document.title}
        onChange={(e) => {
          const title = e.target.value
          setDocumentFile((prev) => {
            const newDoc = { ...prev, title }
            debouncedSave(newDoc)
            return newDoc
          })
        }}
        placeholder="Enter document title..."
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

              <OnChangePlugin ignoreSelectionChange={true} onChange={handleEditorChange} />
            </FloatingLinkContext>
          </SharedAutocompleteContext>
        </TooltipProvider>
      </LexicalComposer>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={exportAsDoc} disabled={isSaving || !documentFile.content}>
          Export as .docx
        </Button>
        <Button onClick={() => saveDocument(documentFile)} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export default Editor
