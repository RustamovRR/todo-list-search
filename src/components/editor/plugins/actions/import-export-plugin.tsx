import { importFile } from '@lexical/file'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createParagraphNode, $createTextNode, $getRoot, $isRootNode } from 'lexical'
import { DownloadIcon, LoaderIcon, UploadIcon } from 'lucide-react'
import mammoth from 'mammoth'
import { useState, useCallback } from 'react'
import { pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import toast from 'react-hot-toast'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`

export function ImportExportPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [importStatus, setImportStatus] = useState('')
  const [isExporting, setIsExporting] = useState(false)

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
          setImportStatus('PDF fayl o\'qilmoqda...')

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

  const importContent = async (file: File) => {
    try {
      if (file.name.endsWith('.lexical')) {
        importFile(editor)
        return
      }

      setIsLoading(true)
      setProgress(0)
      setCurrentPage(0)

      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setImportStatus('DOCX fayl yuklanmoqda...')
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        const text = result.value

        editor.update(() => {
          const root = $getRoot()
          root.clear()
          const paragraphs = text.split('\n\n')
          paragraphs.forEach((paragraph) => {
            if (paragraph.trim()) {
              const paragraphNode = $createParagraphNode()
              const textNode = $createTextNode(paragraph)
              paragraphNode.append(textNode)
              root.append(paragraphNode)
            }
          })
        })
        toast.success('DOCX fayl muvaffaqiyatli yuklandi')
      } else if (file.type === 'application/pdf') {
        try {
          setImportStatus('PDF yuklash boshlanmoqda...')
          const text = await extractTextFromPDF(file)

          setImportStatus('Tarkibni formatlash...')
          editor.update(() => {
            const root = $getRoot()
            root.clear()
            const paragraphs = text.split('\n\n')
            paragraphs.forEach((paragraph) => {
              if (paragraph.trim()) {
                const paragraphNode = $createParagraphNode()
                const textNode = $createTextNode(paragraph)
                paragraphNode.append(textNode)
                root.append(paragraphNode)
              }
            })
          })

          toast.success('PDF fayl muvaffaqiyatli yuklandi')
        } catch (pdfError) {
          console.error('PDF import error:', pdfError)
          toast.error('PDF faylni yuklab bo\'lmadi. Fayl buzilgan yoki parol bilan himoyalangan bo\'lishi mumkin.')
        }
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus('Xatolik yuz berdi')
      toast.error('Faylni yuklab bo\'lmadi')
    } finally {
      setIsLoading(false)
      setProgress(0)
      setCurrentPage(0)
      setTotalPages(0)
      setImportStatus('')
    }
  }

  const exportToDocx = useCallback(() => {
    if (!editor) return

    editor.update(() => {
      const docxParagraphs: any[] = []
      const nodes = $getRoot().getChildren()

      nodes.forEach((node) => {
        if (node.getType() === 'paragraph') {
          const text = node.getTextContent()
          if (text.trim()) {
            docxParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                  }),
                ],
              })
            )
          }
        }
      })

      if (docxParagraphs.length === 0) {
        toast.error('Eksport qilish uchun matn kiritilmagan')
        return
      }

      try {
        const doc = new Document({
          sections: [
            {
              properties: {},
              children: docxParagraphs,
            },
          ],
        })

        Packer.toBlob(doc).then((blob) => {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'document.docx'
          link.click()
          URL.revokeObjectURL(url)
          toast.success('Hujjat muvaffaqiyatli eksport qilindi')
        })
      } catch (error) {
        console.error('Export error:', error)
        toast.error('Eksport qilishda xatolik yuz berdi')
      }
    })
  }, [editor])

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.docx,.pdf,.lexical'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) {
        if (file.name.endsWith('.lexical')) {
          importFile(editor)
        } else {
          await importContent(file)
        }
      }
    }
    input.click()
  }

  return (
    <>
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

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
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
          </Button>
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
            size={'sm'}
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
    </>
  )
}
