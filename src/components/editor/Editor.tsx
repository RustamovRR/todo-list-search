'use client'

import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import {
  $getRoot,
  $getSelection,
  EditorState,
  LexicalEditor,
  SerializedEditorState,
  $createParagraphNode,
  $createTextNode,
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from 'lexical'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FloatingLinkContext } from './context/floating-link-context'
import { SharedAutocompleteContext } from './context/shared-autocomplete-context'
import { nodes } from './nodes/nodes'
import { Plugins } from './plugins/plugins'
import { editorTheme } from './themes/editor-theme'
import { useCallback, useEffect, useRef, useState } from 'react'
import { debounce } from 'lodash-es'
import { toast } from 'sonner'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { documentDB } from '@/lib/db'

interface Document {
  id?: string
  title: string
  content: string
}

const editorConfig: InitialConfigType = {
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

const Editor = () => {
  const [documentFile, setDocumentFile] = useState<Document>({
    title: '',
    content: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<LexicalEditor | null>(null)

 
  // Editor reference'ni saqlash
  const handleEditorRef = useCallback((editor: LexicalEditor) => {
    console.log('🔗 Editor reference received')
    editorRef.current = editor

    // Paste event'ini handle qilish
    editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const text = event.clipboardData?.getData('text/plain')
        if (!text) return false

        // Formatlangan matnni editor'ga qo'yish
        editor.update(() => {
          const selection = $getSelection()
          if (selection) {
            selection.insertText(text)
          }
        })

        // Original paste'ni to'xtatish
        event.preventDefault()
        return true
      },
      COMMAND_PRIORITY_HIGH,
    )
  }, [])

  // Save document
  const saveDocument = async (doc: Document) => {
    if (!doc.title.trim() || !doc.content.trim()) {
      console.log('⚠️ Empty document, skipping save')
      return
    }

    console.log('💾 Saving Document:', {
      title: doc.title,
      contentLength: doc.content.length,
      isNew: !doc.id,
      preview: doc.content.slice(0, 100) + '...',
    })

    try {
      setIsSaving(true)
      const savedDoc = doc.id
        ? await documentDB.updateDocument(doc.id, doc)
        : await documentDB.createDocument(doc as any)

      console.log('✅ Document Saved:', {
        id: savedDoc.id,
        title: savedDoc.title,
        timestamp: new Date().toISOString(),
      })

      setDocumentFile((prev) => ({ ...prev, id: savedDoc.id }))
      toast.success('Saved successfully')
    } catch (error) {
      console.error('❌ Save Error:', error)
      toast.error('Failed to save document')
    } finally {
      setIsSaving(false)
    }
  }

  // Debounced save
  const debouncedSave = useCallback(
    debounce((doc: Document) => {
      console.log('⌛ Debounced save triggered')
      saveDocument(doc)
    }, 1000),
    [],
  )

  // Editor changes
  const handleEditorChange = useCallback(
    (editorState: EditorState) => {
      if (!editorRef.current) return

      editorState.read(() => {
        const content = $getRoot().getTextContent()
        console.log('📝 Editor Content Changed:', {
          length: content.length,
          preview: content.slice(0, 100) + '...',
          paragraphs: content.split('\n').length,
          timestamp: new Date().toISOString(),
        })

        setDocumentFile((prev) => {
          const newDoc = { ...prev, content }
          debouncedSave(newDoc)
          return newDoc
        })
      })
    },
    [debouncedSave],
  )

  // Load document into editor
  const loadDocument = useCallback(async (id: string) => {
    console.log('📂 Loading document:', id)

    try {
      const doc = await documentDB.getDocument(id)
      if (!doc || !editorRef.current) {
        console.log('⚠️ Document or editor not found:', {
          docExists: !!doc,
          editorExists: !!editorRef.current,
        })
        return
      }

      console.log('📄 Document loaded:', {
        id: doc.id,
        title: doc.title,
        contentLength: doc.content.length,
        paragraphs: doc.content.split('\n').length,
      })

      // Update document state
      setDocumentFile(doc)

      // Update editor content
      editorRef.current.update(() => {
        const root = $getRoot()
        console.log('🧹 Clearing editor content')
        root.clear()

        const paragraphs = doc.content.split('\n')
        console.log('📝 Creating paragraphs:', paragraphs.length)

        paragraphs.forEach((text, index) => {
          if (text.trim()) {
            const paragraph = $createParagraphNode()
            paragraph.append($createTextNode(text))
            root.append(paragraph)
          }
        })
      })

      return doc
    } catch (error) {
      console.error('❌ Error loading document:', error)
      toast.error('Failed to load document')
    }
  }, [])

  // Export as .docx file
  const exportAsDoc = async () => {
    try {
      const { Document, Paragraph, Packer } = await import('docx')

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: documentFile.title,
              }),
              new Paragraph({
                text: documentFile.content,
              }),
            ],
          },
        ],
      })

      const buffer = await Packer.toBlob(doc)
      const url = URL.createObjectURL(buffer)
      const link = document.createElement('a')
      link.href = url
      link.download = `${documentFile.title || 'document'}.docx`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('Document exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export document')
    }
  }

  // Handle search result click
  useEffect(() => {
    const handleOpenDocument = async (
      event: CustomEvent<{ documentId: string; position: { paragraph: number; offset: number } }>,
    ) => {
      const { documentId, position } = event.detail

      console.log('🔍 Opening Search Result:', {
        documentId,
        position,
        timestamp: new Date().toISOString(),
      })

      try {
        const doc = await documentDB.getDocument(documentId)
        if (!doc || !editorRef.current) {
          console.log('⚠️ Document not loaded or editor not ready')
          return
        }

        // Wait for editor to update
        setTimeout(() => {
          if (!editorRef.current) return

          editorRef.current.update(() => {
            const root = $getRoot()
            const paragraphs = root.getChildren()

            console.log('🔎 Finding paragraph:', {
              targetParagraph: position.paragraph,
              totalParagraphs: paragraphs.length,
              paragraphContent: paragraphs[position.paragraph]?.getTextContent(),
            })

            if (paragraphs[position.paragraph]) {
              const element = paragraphs[position.paragraph].getKey()
              const domElement = editorRef.current?.getElementByKey(element)

              if (domElement) {
                console.log('📍 Scrolling to Position:', {
                  paragraph: position.paragraph,
                  element: element,
                  offset: position.offset,
                  content: domElement.textContent,
                })

                // Scroll to element
                domElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

                // Highlight
                console.log('✨ Adding highlight')
                domElement.classList.add('search-result-highlight')

                // 3 soniyadan keyin highlight'ni olib tashlash
                setTimeout(() => {
                  console.log('🔄 Removing highlight')
                  domElement.classList.remove('search-result-highlight')
                }, 3000)
              } else {
                console.log('⚠️ DOM element not found for key:', element)
              }
            } else {
              console.log('⚠️ Paragraph not found:', position.paragraph)
            }
          })
        }, 100)
      } catch (error) {
        console.error('❌ Error Opening Document:', error)
        toast.error('Failed to open document')
      }
    }

    console.log('👂 Adding openDocument event listener')
    window.addEventListener('openDocument', handleOpenDocument as any)
    return () => {
      console.log('🗑️ Removing openDocument event listener')
      window.removeEventListener('openDocument', handleOpenDocument as any)
    }
  }, [loadDocument])

  return (
    <div className="m-4 overflow-hidden h-full rounded-lg border bg-background shadow">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-4 border-b">
          <Input
            type="text"
            placeholder="Document title"
            value={documentFile.title}
            onChange={(e) => setDocumentFile((prev) => ({ ...prev, title: e.target.value }))}
            className="max-w-sm"
          />
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={exportAsDoc} disabled={isSaving || !documentFile.content}>
              Export as .docx
            </Button>
            <Button onClick={() => saveDocument(documentFile)} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <LexicalComposer initialConfig={editorConfig}>
          <SharedAutocompleteContext>
            <FloatingLinkContext>
              <div className="relative h-full w-full">
                <TooltipProvider>
                  <div className="w-full h-full p-4">
                    <Plugins setEditor={handleEditorRef} />
                  </div>
                </TooltipProvider>
              </div>
              <OnChangePlugin onChange={handleEditorChange} />
            </FloatingLinkContext>
          </SharedAutocompleteContext>
        </LexicalComposer>
      </div>
    </div>
  )
}

export default Editor
