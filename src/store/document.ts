// src/store/document.ts
import { create } from 'zustand'
import { Document } from '@/lib/db'

interface DocumentStore {
  currentDocument: Document | null
  setCurrentDocument: (doc: Document | null) => void
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  currentDocument: null,
  setCurrentDocument: (doc) => set({ currentDocument: doc }),
}))
