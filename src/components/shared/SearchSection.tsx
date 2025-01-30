'use client'

// components/shared/SearchSection.tsx
import { useEffect, useRef, useState } from 'react'
import { SearchEngine } from '@/lib/search'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { debounce } from 'lodash-es'

interface SearchResult {
  id: string
  title: string
  content: string
  highlight: string
}

export default function SearchSection() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const searchEngine = useRef<SearchEngine | null>(null)

  useEffect(() => {
    const initSearch = async () => {
      if (!searchEngine.current) {
        searchEngine.current = new SearchEngine()

        // Load all documents
        const response = await fetch('/api/documents')
        const { documents } = await response.json()

        searchEngine.current.addDocuments(documents)
      }
    }

    initSearch()
  }, [])

  const handleSearch = debounce(async (term: string) => {
    if (!searchEngine.current || !term.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const searchResults = await searchEngine.current.search(term)
      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, 300)

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="relative">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            handleSearch(e.target.value)
          }}
          placeholder="Search in documents..."
          className="w-full"
        />
        {isLoading && (
          <div className="absolute right-2 top-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      <ScrollArea className="flex-grow">
        {results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result) => (
              <Card key={result.id}>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">{result.title}</h3>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: result.highlight,
                    }}
                    className="text-sm text-gray-600"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchTerm ? (
          <p className="text-center text-gray-500">No results found</p>
        ) : null}
      </ScrollArea>
    </div>
  )
}
