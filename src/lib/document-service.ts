import FlexSearch from 'flexsearch'
import { nanoid } from 'nanoid'
import { db } from './firebase'
import { collection, doc, getDocs, setDoc, getDoc, query, orderBy, limit } from 'firebase/firestore'

interface Document {
  id?: string
  title: string
  content: string
  index?: any
  createdAt?: Date
  updatedAt?: Date
}

interface SearchResult {
  id: string
  title: string
  content: string
  context: string
  position: {
    paragraph: number
    offset: number
  }
  highlight: string
  score: number
}

export class DocumentService {
  private index: any

  constructor() {
    // @ts-ignore - FlexSearch types are not complete
    this.index = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['content', 'title'],
        store: ['content', 'title']
      },
      tokenize: 'forward',
      cache: true
    })
  }

  async saveDocument(document: Document): Promise<string> {
    try {
      const docId = document.id || nanoid()

      // Save to Firebase without index
      await setDoc(doc(db, 'documents', docId), {
        title: document.title,
        content: document.content,
        createdAt: document.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: document.updatedAt?.toISOString() || new Date().toISOString()
      })



      return docId
    } catch (error) {
      console.error('Error saving document to Firebase:', error)
      throw error // Re-throw the error to be caught by the caller
    }
  }

  async loadDocument(id: string): Promise<Document | null> {
    try {
      const docRef = doc(db, 'documents', id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          title: data.title,
          content: data.content,
          createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
        }
      }

      return null
    } catch (error) {
      console.error('Error loading document:', error)
      throw error
    }
  }

  async loadDocuments(): Promise<Document[]> {
    try {
      const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
        }
      })
    } catch (error) {
      console.error('Error loading documents:', error)
      throw error
    }
  }

  async searchDocuments(query: string): Promise<SearchResult[]> {
    try {
      // Document index uchun qidiruv sintaksisi
      const results = (await this.index.searchAsync(query, {
        field: ['content', 'title'], // qaysi maydonlardan qidirish
        limit: 10,
        suggest: true,
      })) as Array<{ field: string; result: string[] }>

      const searchResults: SearchResult[] = []

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
}

export const documentService = new DocumentService()
