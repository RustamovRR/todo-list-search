'use client'

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import {
  $getRoot,
  $getSelection,
  EditorState,
  LexicalEditor,
  $createParagraphNode,
  $createTextNode,
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from 'lexical'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FloatingLinkContext } from './context/floating-link-context'
import { SharedAutocompleteContext } from './context/shared-autocomplete-context'
import { Plugins } from './plugins/plugins'
import { useCallback, useEffect, useRef, useState } from 'react'
import { debounce } from 'lodash-es'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { documentDB } from '@/lib/db'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { editorConfig } from './editorConfig'

interface Document {
  id?: string
  title: string
  content: string
}

const formSchema = z.object({
  title: z.string().min(1, 'Hujjat sarlavhasi kiritilishi shart'),
})

type FormValues = z.infer<typeof formSchema>

const Editor = () => {
  const [documentFile, setDocumentFile] = useState<Document>({
    title: '',
    content: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<LexicalEditor | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: documentFile.title,
    },
    mode: 'onChange', // Real-time validation
  })

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
    const result = await form.trigger('title')
    if (!result) {
      return
    }

    if (!doc.content.trim()) {
      toast.error("Hujjat matni bo'sh bo'lishi mumkin emas")
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
      toast.success('Hujjat muvaffaqiyatli saqlandi')
    } catch (error) {
      console.error('❌ Save Error:', error)
      toast.error('Hujjatni saqlashda xatolik yuz berdi')
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
  const handleEditorChange = useCallback((editorState: EditorState) => {
    if (!editorRef.current) return

    editorState.read(() => {
      const content = $getRoot().getTextContent()
      console.log('📝 Editor Content Changed:', {
        length: content.length,
        preview: content.slice(0, 100) + '...',
        paragraphs: content.split('\n').length,
        timestamp: new Date().toISOString(),
      })

      setDocumentFile((prev) => ({ ...prev, content }))
    })
  }, [])

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
      toast.error('Hujjatni yuklashda xatolik yuz berdi')
    }
  }, [])

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
        toast.error('Hujjatni ochishda xatolik yuz berdi')
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
    <div className="mx-4 mt-4 mb-0 max-h-[90vh] rounded-lg border bg-background shadow overflow-hidden">
      <div className="flex flex-col h-full">
        <Form {...form}>
          <div className="flex items-center gap-4 px-4 py-2 border-b">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Hujjat sarlavhasini kiriting"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        setDocumentFile((prev) => ({ ...prev, title: e.target.value }))
                        // Clear errors when input has value
                        if (e.target.value.trim()) {
                          form.clearErrors('title')
                        }
                      }}
                      value={documentFile.title}
                      className={cn(
                        'max-w-sm',
                        form.formState.errors.title && 'border-destructive focus-visible:ring-destructive',
                      )}
                    />
                  </FormControl>
                  <FormMessage className="text-xs absolute" />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2 ml-auto">
              <Button onClick={() => saveDocument(documentFile)} disabled={isSaving}>
                {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </div>
        </Form>

        <div className="flex-grow overflow-auto">
          <LexicalComposer initialConfig={editorConfig}>
            <SharedAutocompleteContext>
              <FloatingLinkContext>
                <div className="relative h-full w-full">
                  <TooltipProvider>
                    <div className="w-full h-full p-4 pb-0">
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
    </div>
  )
}

export default Editor
