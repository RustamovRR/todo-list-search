import { DocumentType } from '@/types'
import { create } from 'zustand'

interface DocumentStore {
  currentDocument: DocumentType | null
  setCurrentDocument: (doc: DocumentType | null) => void
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  currentDocument: null,
  setCurrentDocument: (doc) => set({ currentDocument: doc }),
}))
