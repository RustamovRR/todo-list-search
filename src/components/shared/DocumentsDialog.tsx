'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { FileText, Trash2, ExternalLink } from 'lucide-react'
import { documentDB, type Document } from '@/lib/db'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useDocumentStore } from '@/store/document'

interface DocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentsDialog({ open, onOpenChange }: DocumentsDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument)

  useEffect(() => {
    if (open) {
      loadDocuments()
    }
  }, [open])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const docs = await documentDB.getAllDocuments()
      // Tartiblashdan oldin yangi array yaratamiz
      const sortedDocs = [...docs].sort((a, b) => b.updatedAt - a.updatedAt)
      setDocuments(sortedDocs)
    } catch (error) {
      console.error('Failed to load documents:', error)
      toast.error('Hujjatlarni yuklashda xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hujjatni o'chirmoqchimisiz?")) return

    try {
      await documentDB.deleteDocument(id)
      toast.success("Hujjat o'chirildi")
      loadDocuments()
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.error("Hujjatni o'chirishda xatolik yuz berdi")
    }
  }

  const handleOpenDocument = (doc: Document) => {
    setCurrentDocument(doc)
    onOpenChange(false)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mening hujjatlarim
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-8rem)] mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Hujjatlar mavjud emas</p>
              <p className="text-sm mt-1">Yangi hujjat yaratish uchun editordan foydalaning</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{doc.title}</h3>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Yaratilgan: {formatDate(doc.createdAt)}</span>
                      <span>O'zgartirilgan: {formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDocument(doc)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id as string)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
