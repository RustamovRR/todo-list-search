// lib/db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb'
import FlexSearch from 'flexsearch'

interface Document {
  id?: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

interface SearchIndex {
  documents: Document[]
  index: any // FlexSearch index
}

interface MyDB extends DBSchema {
  documents: {
    key: string
    value: Document
    indexes: { 'by-date': number }
  }
  search_index: {
    key: 'index'
    value: SearchIndex
  }
}

class DocumentDB {
  private db: Promise<IDBPDatabase<MyDB>>
  private searchEngine: any

  constructor() {
    this.db = this.initDB()
    this.searchEngine = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['title', 'content'],
        store: ['title', 'content', 'createdAt', 'updatedAt'],
      },
      tokenize: 'forward',
      context: {
        resolution: 9,
        depth: 2,
        bidirectional: true,
      },
    })
  }

  private async initDB() {
    return openDB<MyDB>('documents-db', 1, {
      upgrade(db) {
        // Documents store
        const documentStore = db.createObjectStore('documents', {
          keyPath: 'id',
          autoIncrement: true,
        })
        documentStore.createIndex('by-date', 'updatedAt')

        // Search index store
        db.createObjectStore('search_index')
      },
    })
  }

  // Document yaratish
  async createDocument(doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) {
    const timestamp = Date.now()
    const document: Document = {
      ...doc,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const db = await this.db
    const tx = db.transaction(['documents', 'search_index'], 'readwrite')

    // Save document
    const id = await tx.objectStore('documents').add(document)
    const savedDoc = { ...document, id: id.toString() }

    // Update search index
    this.searchEngine.add(savedDoc)
    await tx.objectStore('search_index').put(
      {
        documents: await this.getAllDocuments(),
        index: this.searchEngine,
      },
      'index',
    )

    await tx.done
    return savedDoc
  }

  // Document yangilash
  async updateDocument(id: string, doc: Partial<Document>) {
    const db = await this.db
    const tx = db.transaction(['documents', 'search_index'], 'readwrite')

    const existingDoc = await tx.objectStore('documents').get(id)
    if (!existingDoc) {
      throw new Error('Document not found')
    }

    const updatedDoc = {
      ...existingDoc,
      ...doc,
      updatedAt: Date.now(),
    }

    // Update document
    await tx.objectStore('documents').put(updatedDoc)

    // Update search index
    this.searchEngine.update(id, updatedDoc)
    await tx.objectStore('search_index').put(
      {
        documents: await this.getAllDocuments(),
        index: this.searchEngine,
      },
      'index',
    )

    await tx.done
    return updatedDoc
  }

  // Document o'chirish
  async deleteDocument(id: string) {
    const db = await this.db
    const tx = db.transaction(['documents', 'search_index'], 'readwrite')

    await tx.objectStore('documents').delete(id)

    // Update search index
    this.searchEngine.remove(id)
    await tx.objectStore('search_index').put(
      {
        documents: await this.getAllDocuments(),
        index: this.searchEngine,
      },
      'index',
    )

    await tx.done
  }

  // Barcha dokumentlarni olish
  async getAllDocuments() {
    const db = await this.db
    return db.getAllFromIndex('documents', 'by-date')
  }

  // Search
  async searchDocuments(query: string) {
    const results = await this.searchEngine.search(query, {
      limit: 10,
      suggest: true,
    })

    return results.map((result: any) => ({
      ...result,
      highlight: this.highlightMatches(result.content, query),
    }))
  }

  private highlightMatches(text: string, query: string) {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

    const regex = new RegExp(`(${words.join('|')})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }
}

export const documentDB = new DocumentDB()
