// db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb'
import FlexSearch from 'flexsearch'

interface Document {
  id?: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

interface SearchResult {
  id: string
  title: string
  content: string
  context: string
  score: number
  position: {
    paragraph: number
    offset: number
  }
  highlight: string
}

interface MyDB extends DBSchema {
  documents: {
    key: string
    value: Document
    indexes: { 'by-date': number }
  }
}

class DocumentDB {
  private db: Promise<IDBPDatabase<MyDB>>
  private searchIndex: any

  constructor() {
    this.db = this.initDB()
    // FlexSearch konfiguratsiyasini yangilash
    this.searchIndex = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['content', 'title'],
        store: ['title', 'content']
      },
      tokenize: 'forward',
      context: {
        resolution: 9,
        depth: 2,
        bidirectional: true
      }
    })
    
    // Mavjud hujjatlarni indekslash
    this.initializeSearchIndex()
  }

  private async initDB() {
    return openDB<MyDB>('documents-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' })
          store.createIndex('by-date', 'updatedAt')
        }
      },
    })
  }

  private async initializeSearchIndex() {
    try {
      const docs = await this.getAllDocuments()
      docs.forEach(doc => {
        if (doc.id) {
          this.searchIndex.add({
            id: doc.id,
            title: doc.title,
            content: doc.content
          })
        }
      })
      console.log('✅ Search index initialized with', docs.length, 'documents')
    } catch (error) {
      console.error('❌ Error initializing search index:', error)
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  private extractContext(text: string, query: string): string {
    const words = query.toLowerCase().split(/\s+/)
    const sentences = text.split(/[.!?]+/)
    
    // Eng yaxshi kontekstni topish
    let bestMatch = {
      sentence: '',
      matchCount: 0,
      index: 0
    }

    sentences.forEach((sentence, index) => {
      const matchCount = words.filter(word => 
        sentence.toLowerCase().includes(word)
      ).length

      if (matchCount > bestMatch.matchCount) {
        bestMatch = { sentence, matchCount, index }
      }
    })

    // Kontekst uchun qo'shimcha gaplarni olish
    const contextStart = Math.max(0, bestMatch.index - 1)
    const contextEnd = Math.min(sentences.length, bestMatch.index + 2)
    return sentences.slice(contextStart, contextEnd).join('. ').trim()
  }

  private highlightText(text: string, query: string): string {
    const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 1)
    let highlighted = text

    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi')
      highlighted = highlighted.replace(regex, '<mark>$1</mark>')
    })

    return highlighted
  }

  private findPosition(content: string, query: string): { paragraph: number; offset: number } {
    const paragraphs = content.split('\n')
    const words = query.toLowerCase().split(/\s+/)
    
    // Har bir paragrafni tekshirish
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].toLowerCase()
      
      // So'zlardan birortasi paragrafda bormi
      for (const word of words) {
        if (word.length > 1 && paragraph.includes(word)) {
          return {
            paragraph: i,
            offset: paragraph.indexOf(word)
          }
        }
      }
    }
    
    return {
      paragraph: 0,
      offset: 0
    }
  }

  async createDocument(doc: Omit<Document, 'id'>): Promise<Document> {
    const timestamp = Date.now()
    const newDoc = {
      ...doc,
      id: this.generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const db = await this.db
    await db.put('documents', newDoc)

    // Qidiruv indeksiga qo'shish
    if (newDoc.id) {
      this.searchIndex.add({
        id: newDoc.id,
        title: newDoc.title,
        content: newDoc.content
      })
    }

    return newDoc
  }

  async updateDocument(id: string, doc: Partial<Document>): Promise<Document> {
    const db = await this.db
    const existingDoc = await db.get('documents', id)
    if (!existingDoc) {
      throw new Error('Document not found')
    }

    const updatedDoc = {
      ...existingDoc,
      ...doc,
      updatedAt: Date.now(),
    }

    await db.put('documents', updatedDoc)

    // Qidiruv indeksini yangilash
    this.searchIndex.update({
      id: updatedDoc.id,
      title: updatedDoc.title,
      content: updatedDoc.content
    })

    return updatedDoc
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const db = await this.db
    return db.get('documents', id)
  }

  async getAllDocuments(): Promise<Document[]> {
    const db = await this.db
    return db.getAllFromIndex('documents', 'by-date')
  }

  async searchDocuments(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return []
    }

    try {
      // FlexSearch'da qidirish
      const results = await this.searchIndex.search(query, {
        enrich: true,
        suggest: true
      })

      console.log('🔍 Raw search results:', results)

      if (!results || !results.length) {
        return []
      }

      // Natijalarni formatlash
      const searchResults: SearchResult[] = []
      
      for (const field of results) {
        for (const result of field.result) {
          if (!result.doc) continue

          const doc = await this.getDocument(result.id)
          if (!doc) continue

          const context = this.extractContext(doc.content, query)
          const position = this.findPosition(doc.content, query)
          
          searchResults.push({
            id: doc.id!,
            title: doc.title,
            content: doc.content,
            context: context,
            score: result.score || 0,
            position: position,
            highlight: this.highlightText(context, query)
          })
        }
      }

      // Score bo'yicha saralash
      return searchResults.sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('❌ Search error:', error)
      throw error
    }
  }
}

export const documentDB = new DocumentDB()
