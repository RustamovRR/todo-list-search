import { importFile } from '@lexical/file'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createParagraphNode, $createTextNode, $getRoot, $isRootNode } from 'lexical'
import { DownloadIcon, LoaderIcon, UploadIcon } from 'lucide-react'
import mammoth from 'mammoth'
import { useState } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'

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
          setImportStatus('Reading PDF file...')

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
            setImportStatus(`Processing page ${i} of ${pages}`)
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
        setImportStatus('Importing DOCX file...')
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
        toast({
          title: 'Success',
          description: 'DOCX file imported successfully',
        })
      } else if (file.type === 'application/pdf') {
        try {
          setImportStatus('Starting PDF import...')
          const text = await extractTextFromPDF(file)

          setImportStatus('Formatting content...')
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

          toast({
            title: 'Success',
            description: 'PDF file imported successfully',
          })
        } catch (pdfError) {
          console.error('PDF import error:', pdfError)
          toast({
            title: 'Error',
            description: 'Failed to import PDF file. The file might be corrupted or password protected.',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: 'Error',
        description: 'Failed to import file',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setProgress(0)
      setCurrentPage(0)
      setTotalPages(0)
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
      const docx = new DocxDocument({
        sections: [
          {
            properties: {},
            children: [],
          },
        ],
      })

      editorState.read(() => {
        const root = $getRoot()
        const children = root.getChildren()

        const docxParagraphs = children
          .map((node) => {
            if ($isRootNode(node)) return null

            const textContent = node.getTextContent()
            return new Paragraph({
              children: [
                new TextRun({
                  text: textContent,
                }),
              ],
            })
          })
          .filter(Boolean)

        docx.addSection({
          children: docxParagraphs,
        })
      })

      setProgress(60)
      setImportStatus('Generating DOCX file...')

      const buffer = await Packer.toBuffer(docx)
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      setProgress(90)
      setImportStatus('Saving file...')

      saveAs(blob, `Document_${new Date().toISOString()}.docx`)

      setProgress(100)
      toast({
        title: 'Success',
        description: 'Document exported as DOCX successfully',
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Error',
        description: 'Failed to export document as DOCX',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setIsExporting(false)
      setProgress(0)
      setImportStatus('')
    }
  }

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
            <DialogTitle>{isExporting ? 'Exporting Document' : 'Importing Document'}</DialogTitle>
            <DialogDescription>{importStatus}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Progress value={progress} className="w-full" />
            {!isExporting && totalPages > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Page {currentPage} of {totalPages}
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
            title="Import"
            aria-label="Import content from file"
            size={'sm'}
            className="p-2"
            disabled={isLoading}
          >
            {isLoading && !isExporting ? <LoaderIcon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isLoading && !isExporting ? 'Importing...' : 'Import Content (.docx, .pdf)'}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={'ghost'}
            onClick={exportToDocx}
            title="Export"
            aria-label="Export as DOCX"
            size={'sm'}
            className="p-2"
            disabled={isLoading}
          >
            {isLoading && isExporting ? <LoaderIcon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isLoading && isExporting ? 'Exporting...' : 'Export as DOCX'}</TooltipContent>
      </Tooltip>
    </>
  )
}
