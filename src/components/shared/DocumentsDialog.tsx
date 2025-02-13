'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FileText, Trash2, Search, ExternalLink } from 'lucide-react'
import { DocumentType } from '@/types'
import { documentService } from '@/lib/document-service'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useDocumentStore } from '@/store/document'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import 'dayjs/locale/uz'

interface DocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Document = DocumentType & {
  id: string
}

export function DocumentsDialog({ open, onOpenChange }: DocumentsDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const { data: session } = useSession()
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument)

  useEffect(() => {
    if (open && session?.user?.id) {
      loadDocuments()
    }
  }, [open, session?.user?.id])

  useEffect(() => {
    // O'chirilayotgan hujjatlarni filterlash
    const filtered = documents
      .filter((doc) => !deletingIds.has(doc.id))
      .filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredDocuments(filtered)
  }, [documents, searchQuery, deletingIds])

  const loadDocuments = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const docs = await documentService.loadDocuments(session.user.id)
      // Tartiblashdan oldin yangi array yaratamiz
      const sortedDocs = [...docs].sort((a, b) => {
        return dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf()
      })
      setDocuments(sortedDocs)
    } catch (error) {
      console.error('Failed to load documents:', error)
      toast.error('Hujjatlarni yuklashda xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    // Optimistic update
    setDeletingIds((prev) => new Set(prev).add(deleteId))
    setDeleteId(null)

    try {
      await documentService.deleteDocument(deleteId)
      toast.success("Hujjat o'chirildi")
      // Muvaffaqiyatli o'chirilganda, hujjatni documents dan olib tashlaymiz
      setDocuments((prev) => prev.filter((doc) => doc.id !== deleteId))
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.error("Hujjatni o'chirishda xatolik yuz berdi")
      // Xatolik bo'lsa, hujjatni qaytarib qo'yamiz
      setDeletingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(deleteId)
        return newSet
      })
    }
  }

  const handleOpenDocument = (doc: Document) => {
    setCurrentDocument(doc)
    onOpenChange(false)
  }

  const formatDate = (date: string | Date) => {
    return dayjs(date).locale('uz').format('D-MMMM YYYY, HH:mm')
  }

  return (
    <>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hujjatni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham bu hujjatni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl max-h-[85vh]"
          onInteractOutside={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Barcha fayllar
              </DialogTitle>
              <div className="relative w-64 mr-12">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Hujjat nomini qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[calc(85vh-8rem)] mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-[calc(85vh-12rem)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Hujjatlar mavjud emas</p>
                <p className="text-sm mt-1">Yangi hujjat yaratish uchun editordan foydalaning</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{doc.content}</p>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Yaratilgan: {formatDate(doc.createdAt)}</span>
                        <span>O'zgartirilgan: {formatDate(doc.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button className="bg-green-600 hover:bg-green-600/90 text-white" onClick={() => handleOpenDocument(doc)}>
                        O'zgartirish
                      </Button>
                      <Button variant="destructive" onClick={() => setDeleteId(doc.id)}>
                        O'chirish
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
