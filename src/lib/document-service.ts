import FlexSearch from 'flexsearch'
import { nanoid } from 'nanoid'
import { db } from './firebase'
import { collection, doc, getDocs, setDoc, getDoc, query, orderBy, where, deleteDoc } from 'firebase/firestore'
import { DocumentType, SearchResultType } from '@/types'

export class DocumentService {
  private index: any

  constructor() {
    // @ts-ignore - FlexSearch types are not complete
    this.index = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['content', 'title'],
        store: ['content', 'title'],
      },
      tokenize: 'forward',
      cache: true,
    })
  }

  async saveDocument(document: DocumentType): Promise<string> {
    try {
      const docId = document.id || nanoid()
      const documentToSave = {
        ...document,
        id: docId,
        organizationId: document.organizationId || '',
        uploadedBy: document.uploadedBy || document.userId,
        createdAt: document.createdAt || new Date(),
        updatedAt: document.updatedAt || new Date()
      }

      // Save to Firebase
      const documentData = {
        ...documentToSave,
        createdAt: documentToSave.createdAt.toISOString(),
        updatedAt: documentToSave.updatedAt.toISOString(),
      }
      await setDoc(doc(db, 'documents', docId), documentData)

      // Add to FlexSearch index
      this.index.add({
        id: docId,
        title: document.title,
        content: document.content,
      })

      return docId
    } catch (error) {
      console.error('Error saving document to Firebase:', error)
      throw error // Re-throw the error to be caught by the caller
    }
  }

  async loadDocument(id: string): Promise<DocumentType | null> {
    try {
      const docRef = doc(db, 'documents', id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          title: data.title,
          content: data.content,
          userId: data.userId,
          organizationId: data.organizationId || '',
          uploadedBy: data.uploadedBy || data.userId,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        }
      }

      return null
    } catch (error) {
      console.error('Error loading document:', error)
      throw error
    }
  }

  async loadDocuments(userId?: string): Promise<DocumentType[]> {
    try {
      const q = userId
        ? query(collection(db, 'documents'), where('userId', '==', userId))
        : query(collection(db, 'documents'))
      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          userId: data.userId,
          organizationId: data.organizationId || '',
          uploadedBy: data.uploadedBy || data.userId,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        }
      })
    } catch (error) {
      console.error('Error loading documents:', error)
      throw error
    }
  }

  async searchDocuments(query: string, userId?: string): Promise<SearchResultType[]> {
    try {
      if (!userId) return []

      // Foydalanuvchining hujjatlarini Firestore'dan olamiz
      const documents = await this.loadDocuments(userId)

      // Hujjatlarni indekslaymiz
      this.index.remove('*') // Clear index
      for (const doc of documents) {
        this.index.add({
          id: doc.id,
          title: doc.title,
          content: doc.content,
        })
      }

      // Document index uchun qidiruv sintaksisi
      const results = (await this.index.searchAsync(query, {
        field: ['content', 'title'], // qaysi maydonlardan qidirish
        limit: 10,
        suggest: true,
      })) as Array<{ field: string; result: string[] }>

      const searchResults: SearchResultType[] = []

      for (const { field, result } of results) {
        for (const docId of result) {
          // Get document from index store
          const doc = this.index.get(docId) as { content: string; title: string }
          if (!doc) continue

          const content = doc.content
          const title = doc.title

          // Find context around match
          const position = this.findMatchPosition(content, query)
          const context = this.extractContext(content, position.offset)

          searchResults.push({
            id: docId,
            title,
            content,
            context,
            position: {
              paragraph: position.paragraph,
              offset: position.offset,
            },
            highlight: query,
            score: 1, // FlexSearch Document index score'ni qaytarmaydi
          })
        }
      }

      return searchResults
    } catch (error) {
      console.error('Error searching documents:', error)
      throw error
    }
  }

  private findMatchPosition(content: string, query: string) {
    const lowerContent = content.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const offset = lowerContent.indexOf(lowerQuery)

    // Count paragraphs up to match
    const paragraphs = content.slice(0, offset).split('\n')

    return {
      paragraph: paragraphs.length,
      offset,
    }
  }

  private extractContext(content: string, offset: number, contextLength: number = 100) {
    const start = Math.max(0, offset - contextLength / 2)
    const end = Math.min(content.length, offset + contextLength / 2)
    return content.slice(start, end) + (end < content.length ? '...' : '')
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'documents', id))
      // FlexSearch indeksidan ham o'chiramiz
      this.index.remove(id)
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }
}

export const documentService = new DocumentService()
