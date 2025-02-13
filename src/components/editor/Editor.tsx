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
import { documentService } from '@/lib/document-service'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { editorConfig } from './editorConfig'
import { useSession } from 'next-auth/react'

interface Document {
  id?: string
  title: string
  content: string
  createdAt?: Date
  updatedAt?: Date
}

interface BookPart {
  title: string
  content: string
  partNumber: number
  totalParts: number
  characterCount?: number
}

const formSchema = z.object({
  title: z.string().min(1, 'Hujjat sarlavhasi kiritilishi shart'),
})

type FormValues = z.infer<typeof formSchema>

// Format character count (e.g. 1234 -> 1.2K)
const formatCharCount = (count: number): string => {
  if (count < 1000) return `${count}`
  return `${(count / 1000).toFixed(1)}K`
}

const Editor = () => {
  const { data: session } = useSession()
  const [documentFile, setDocumentFile] = useState<Document>({
    title: '',
    content: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [bookParts, setBookParts] = useState<BookPart[]>([])
  const [currentPart, setCurrentPart] = useState<BookPart | null>(null)
  const editorRef = useRef<LexicalEditor | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

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

  // Scroll'ni boshqarish
  useEffect(() => {
    if (editorContainerRef.current && currentPart) {
      // Editor ichidagi contentni topamiz
      const editorContent = editorContainerRef.current.querySelector('.editor-container')
      if (editorContent) {
        // Smooth scroll bilan tepaga qaytaramiz
        editorContent.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      }
    }
  }, [currentPart?.partNumber])

  // Book parts eventini tinglash
  useEffect(() => {
    const handleBookParts = (event: CustomEvent<{ parts: BookPart[]; currentPart: BookPart }>) => {
      console.log('📚 Book parts received:', event.detail)
      setBookParts(event.detail.parts)
      setCurrentPart(event.detail.currentPart)
      setDocumentFile({
        title: event.detail.currentPart.title,
        content: event.detail.currentPart.content,
      })
    }

    window.addEventListener('bookPartsCreated', handleBookParts as EventListener)
    return () => {
      window.removeEventListener('bookPartsCreated', handleBookParts as EventListener)
    }
  }, [])

  // Qismni almashtirish
  const switchPart = (part: BookPart) => {
    // Agar bir xil qism tanlansa, hech narsa qilmaymiz
    if (currentPart?.partNumber === part.partNumber) {
      return
    }

    // Yangi qismga o'tamiz
    setCurrentPart(part)
    setDocumentFile({
      title: part.title,
      content: part.content,
    })
    form.setValue('title', part.title)

    // Editor state'ini yangilash
    if (editorRef.current) {
      const editor = editorRef.current
      editor.update(() => {
        const root = $getRoot()
        root.clear()

        // Kontentni paragraflar bo'yicha qo'shamiz
        const paragraphs = part.content.split('\n')
        paragraphs.forEach(text => {
          if (text.trim()) {
            const paragraph = $createParagraphNode()
            paragraph.append($createTextNode(text))
            root.append(paragraph)
          }
        })

        // Selection'ni birinchi paragrafga o'rnatamiz
        const firstParagraph = root.getFirstChild()
        if (firstParagraph) {
          firstParagraph.selectStart()
        }
      })

      // Editor'ni focus qilish
      setTimeout(() => {
        editor.focus()
        // Scroll'ni tepaga qaytarish
        if (editorContainerRef.current) {
          editorContainerRef.current.scrollTo({
            top: 0,
            behavior: 'smooth',
          })
        }
      }, 50)
    }
  }

  // Save document
  const saveDocument = async (doc: Document) => {
    if (!session?.user?.id) {
      toast.error('Hujjatni saqlash uchun tizimga kirishingiz kerak')
      return
    }

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
      // Firebase'ga saqlash
      const docId = await documentService.saveDocument({
        ...doc,
        userId: session.user.id,
        updatedAt: new Date(),
      })

      // Yangi hujjat bo'lsa ID ni saqlaymiz
      if (!doc.id) {
        setDocumentFile((prev) => ({ ...prev, id: docId }))
      }

      console.log('✅ Document Saved:', {
        id: docId,
        title: doc.title,
        timestamp: new Date().toISOString(),
      })

      setDocumentFile((prev) => ({ ...prev, id: docId }))
      toast.success('Hujjat muvaffaqiyatli saqlandi')
      // Saqlangan partni o'chirish va editor'ni yangilash
      if (currentPart) {
        const updatedParts = bookParts.filter(part => part.partNumber !== currentPart.partNumber)
        setBookParts(updatedParts)
        
        // Editor'ni yangilash
        editorRef.current?.update(() => {
          const root = $getRoot()
          root.clear()

          // Agar keyingi part bo'lsa, uning kontentini o'rnatish
          if (updatedParts.length > 0) {
            const nextPart = updatedParts[0]
            const paragraphs = nextPart.content.split('\n')
            
            paragraphs.forEach(text => {
              if (text.trim()) {
                const paragraph = $createParagraphNode()
                paragraph.append($createTextNode(text))
                root.append(paragraph)
              }
            })

            // State'larni yangilash
            setCurrentPart(nextPart)
            setDocumentFile({
              title: nextPart.title,
              content: nextPart.content,
            })
            form.setValue('title', nextPart.title)
          } else {
            // Bo'sh editor va state'larni tozalash
            const paragraph = $createParagraphNode()
            paragraph.append($createTextNode(''))
            root.append(paragraph)

            setCurrentPart(null)
            setDocumentFile({
              title: '',
              content: '',
            })
            form.reset()
          }
        })
      }
    } catch (error) {
      console.error('❌ Save Error:', error)
      toast.error('Hujjatni saqlashda xatolik yuz berdi')
    } finally {
      setIsSaving(false)
    }
  }

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
      const doc = await documentService.loadDocument(id)
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

  // Handle book parts created
  useEffect(() => {
    const handleBookParts = (event: CustomEvent<{ parts: BookPart[]; currentPart: BookPart }>) => {
      const { parts, currentPart } = event.detail
      setBookParts(parts)
      setCurrentPart(currentPart)
      
      // Title va form state'ni yangilash
      setDocumentFile(prev => ({ ...prev, title: currentPart.title }))
      form.setValue('title', currentPart.title)
    }

    window.addEventListener('bookPartsCreated', handleBookParts as any)
    return () => {
      window.removeEventListener('bookPartsCreated', handleBookParts as any)
    }
  }, [form])

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
        const doc = await documentService.loadDocument(documentId)
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
    <div className="mx-4 mt-4 mb-0 max-h-[90vh] rounded-lg border bg-background shadow ">
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
            <div className="flex items-center gap-4 ml-auto">
              {/* Total character count */}
              <div className="text-sm text-muted-foreground">{formatCharCount(documentFile.content.length)}</div>
              <Button onClick={() => saveDocument(documentFile)} disabled={isSaving}>
                {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </div>
        </Form>

        {/* Kitob qismlari tabs */}
        {bookParts.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 ml-5">
            {bookParts.map((part) => (
              <Button
                key={part.partNumber}
                variant={currentPart?.partNumber === part.partNumber ? 'default' : 'outline'}
                onClick={() => switchPart(part)}
                className="flex items-center gap-2"
              >
                <span>Part {part.partNumber}</span>
                <span className="text-xs text-muted-foreground">({formatCharCount(part.content.length)})</span>
              </Button>
            ))}
          </div>
        )}

        {/* Editor container */}
        <div ref={editorContainerRef} className="relative w-full h-[calc(100vh-12rem)] overflow-hidden">
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
    </div>
  )
}

export default Editor
