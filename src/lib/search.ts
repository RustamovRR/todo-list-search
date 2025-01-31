// lib/search.ts
import FlexSearch from 'flexsearch'

export class SearchEngine {
  private index: any
  private documents: Map<string, any>

  constructor() {
    this.index = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['title', 'content'],
        store: ['title', 'content', 'updatedAt'],
      },
      tokenize: 'forward',
      context: {
        resolution: 9,
        depth: 2,
      },
    })

    this.documents = new Map()
  }

  addDocuments(documents: any[]) {
    documents?.forEach((doc) => {
      this.documents.set(doc.id, doc)
      this.index.add({
        id: doc.id,
        title: doc.title,
        content: doc.content,
      })
    })
  }

  async search(query: string) {
    const results = await this.index.search({
      query,
      limit: 10,
      suggest: true,
    })

    return results.flatMap((result: any) =>
      result.result.map((id: string) => ({
        ...this.documents.get(id),
        highlight: this.highlightMatches(this.documents.get(id).content, query),
      })),
    )
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
