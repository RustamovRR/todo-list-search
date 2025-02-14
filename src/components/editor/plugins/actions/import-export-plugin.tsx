import { importFile } from '@lexical/file'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createParagraphNode, $createTextNode, $getRoot, $isRootNode } from 'lexical'
import { DownloadIcon, LoaderIcon, UploadIcon } from 'lucide-react'
import mammoth from 'mammoth'
import { useState } from 'react'
import { pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import toast from 'react-hot-toast'
import { MAX_CONTENT_LENGTH } from '@/constants'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`

interface BookPart {
  title: string
  content: string
  partNumber: number
  totalParts: number
  characterCount: number
}

export function ImportExportPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [importStatus, setImportStatus] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Matnni qismlarga bo'lish funksiyasi
  const splitContentIntoParts = (content: string, maxLength: number = MAX_CONTENT_LENGTH): string[] => {
    const parts: string[] = []
    let remainingContent = content

    while (remainingContent.length > 0) {
      // Optimal bo'lish nuqtasini topish (gap yoki paragraf oxiri)
      let splitIndex = maxLength
      if (remainingContent.length > maxLength) {
        // Eng yaqin gap oxirini topish
        const lastSentence = remainingContent.slice(0, maxLength).lastIndexOf('.')
        const lastParagraph = remainingContent.slice(0, maxLength).lastIndexOf('\n')

        // Eng yaqin bo'lish nuqtasini tanlash
        splitIndex = Math.max(lastSentence !== -1 ? lastSentence + 1 : 0, lastParagraph !== -1 ? lastParagraph + 1 : 0)

        // Agar hech qanday bo'lish nuqtasi topilmasa, so'z oxiridan bo'lish
        if (splitIndex === 0) {
          const lastSpace = remainingContent.slice(0, maxLength).lastIndexOf(' ')
          splitIndex = lastSpace !== -1 ? lastSpace + 1 : maxLength
        }
      }

      parts.push(remainingContent.slice(0, splitIndex))
      remainingContent = remainingContent.slice(splitIndex).trim()
    }

    return parts
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const buffer = reader.result as ArrayBuffer
          const pdf = await pdfjs.getDocument({ data: buffer }).promise
          let text = ''

          const pages = pdf.numPages
          setTotalPages(pages)
          setImportStatus("PDF fayl o'qilmoqda...")

          for (let i = 1; i <= pages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            const pageText = content.items
              .map((item: any) => item.str)
              .join(' ')
              .replace(/\s+/g, ' ')
            text += pageText + '\n\n'

            setCurrentPage(i)
            setProgress((i / pages) * 100)
            setImportStatus(`Sahifa ${i} ni qayta ishlash ${pages}`)
          }

          resolve(text)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true)
      setProgress(0)
      setCurrentPage(0)

      let content = ''

      if (file.type === 'application/pdf') {
        setImportStatus('Starting PDF import...')
        content = await extractTextFromPDF(file)
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setImportStatus('Importing DOCX file...')
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        content = result.value
      } else if (file.type === 'text/plain') {
        content = await file.text()
      }

      // Kontentni qismlarga bo'lish
      const parts = splitContentIntoParts(content)

      // Kitob nomi
      const bookTitle = file.name.replace(/\.[^/.]+$/, '')

      // Qismlarni yaratish
      const bookParts: BookPart[] = parts.map((content, index) => ({
        title: `${bookTitle} - Part ${index + 1}`,
        content,
        partNumber: index + 1,
        totalParts: parts.length,
        characterCount: content.length,
      }))

      // Editor state'ni yangilash
      const firstPart = bookParts[0]
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        root.append($createParagraphNode().append($createTextNode(firstPart.content)))
      })

      // Qismlarni parent componentga uzatish
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('bookPartsCreated', {
          detail: {
            parts: bookParts,
            currentPart: firstPart,
          },
        })
        window.dispatchEvent(event)
      }

      toast.success(
        parts.length > 1 ? `Book imported and split into ${parts.length} parts` : 'Book imported successfully',
      )
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import file')
    } finally {
      setIsLoading(false)
      setProgress(0)
      setImportStatus('')
    }
  }

  const exportToDocx = async () => {
    try {
      setIsLoading(true)
      setIsExporting(true)
      setImportStatus('Converting document to DOCX format...')
      setProgress(30)

      const editorState = editor.getEditorState()
      let docxParagraphs: Paragraph[] = []

      editorState.read(() => {
        const root = $getRoot()
        const children = root.getChildren()

        docxParagraphs = children
          .map((node) => {
            if ($isRootNode(node)) return null

            const textContent = node.getTextContent()
            if (!textContent.trim()) return null

            return new Paragraph({
              children: [
                new TextRun({
                  text: textContent,
                }),
              ],
            })
          })
          .filter(Boolean) as Paragraph[]
      })

      // Create document with sections
      const doc = new DocxDocument({
        sections: [
          {
            properties: {},
            children: docxParagraphs,
          },
        ],
      })

      setProgress(60)
      setImportStatus('Generating DOCX file...')

      const buffer = await Packer.toBuffer(doc)
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      setProgress(90)
      setImportStatus('Saving file...')

      saveAs(blob, `Document_${new Date().toISOString()}.docx`)

      setProgress(100)
      toast.success('Document exported as DOCX successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export document as DOCX')
    } finally {
      setIsLoading(false)
      setIsExporting(false)
      setProgress(0)
      setImportStatus('')
    }
  }

  // const exportToDocx = useCallback(() => {
  //   if (!editor) return

  //   editor.update(() => {
  //     const docxParagraphs: any[] = []
  //     const nodes = $getRoot().getChildren()

  //     nodes.forEach((node) => {
  //       if (node.getType() === 'paragraph') {
  //         const text = node.getTextContent()
  //         if (text.trim()) {
  //           docxParagraphs.push(
  //             new Paragraph({
  //               children: [
  //                 new TextRun({
  //                   text,
  //                 }),
  //               ],
  //             }),
  //           )
  //         }
  //       }
  //     })

  //     if (docxParagraphs.length === 0) {
  //       toast.error('Eksport qilish uchun matn kiritilmagan')
  //       return
  //     }

  //     try {
  //       const doc = new Document({
  //         sections: [
  //           {
  //             properties: {},
  //             children: docxParagraphs,
  //           },
  //         ],
  //       })

  //       Packer.toBlob(doc).then((blob) => {
  //         const url = URL.createObjectURL(blob)
  //         const link = document.createElement('a')
  //         link.href = url
  //         link.download = 'document.docx'
  //         link.click()
  //         URL.revokeObjectURL(url)
  //         toast.success('Hujjat muvaffaqiyatli eksport qilindi')
  //       })
  //     } catch (error) {
  //       console.error('Export error:', error)
  //       toast.error('Eksport qilishda xatolik yuz berdi')
  //     }
  //   })
  // }, [editor])

  // const handleImport = () => {
  //   const input = document.createElement('input')
  //   input.type = 'file'
  //   input.accept = '.docx,.pdf,.lexical'
  //   input.onchange = async () => {
  //     const file = input.files?.[0]
  //     if (file) {
  //       if (file.name.endsWith('.lexical')) {
  //         importFile(editor)
  //       } else {
  //         await importContent(file)
  //       }
  //     }
  //   }
  //   input.click()
  // }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* <Button
            variant={'ghost'}
            onClick={handleImport}
            title="Yuklash"
            aria-label="Fayl yuklash (.docx, .pdf)"
            size={'sm'}
            className="p-2"
            disabled={isLoading}
          >
            {isLoading && !isExporting ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <UploadIcon className="size-4" />
            )}
          </Button> */}
          <label className="cursor-pointer flex items-center justify-center w-8 h-9 rounded-md hover:bg-gray-100 ">
            <input
              type="file"
              accept=".txt,.pdf,.docx,.lexical"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
              className="hidden"
            />
            <UploadIcon className="size-4" />
          </label>
        </TooltipTrigger>
        <TooltipContent>{isLoading && !isExporting ? 'Yuklanmoqda...' : 'Fayl yuklash (.docx, .pdf)'}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={'ghost'}
            onClick={exportToDocx}
            title="Eksport"
            aria-label="DOCX formatida eksport"
            size="sm"
            className="p-2"
            disabled={isLoading}
          >
            {isLoading && isExporting ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <DownloadIcon className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isLoading && isExporting ? 'Eksport qilinmoqda...' : 'DOCX formatida eksport'}</TooltipContent>
      </Tooltip>

      {isLoading && (
        <Dialog open={isLoading} onOpenChange={setIsLoading}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isExporting ? 'Hujjat eksport qilinmoqda' : 'Fayl yuklanmoqda'}</DialogTitle>
              <DialogDescription>{importStatus}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <Progress value={progress} className="w-full" />
              {!isExporting && totalPages > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Sahifa {currentPage} dan {totalPages}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
