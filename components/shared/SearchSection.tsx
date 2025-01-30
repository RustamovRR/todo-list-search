'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchResult {
  id: string
  title: string
  excerpt: string
}

export default function SearchSection() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const handleSearch = () => {
    // Simulating search results
    const mockResults: SearchResult[] = [
      {
        id: '1',
        title: 'Result 1',
        excerpt: 'This is a sample excerpt for Result 1...',
      },
      {
        id: '2',
        title: 'Result 2',
        excerpt: 'This is a sample excerpt for Result 2...',
      },
      {
        id: '3',
        title: 'Result 3',
        excerpt: 'This is a sample excerpt for Result 3...',
      },
    ]
    setSearchResults(mockResults)
  }

  return (
    <div className="p-4">
      <div className="flex space-x-2 mb-4">
        <Input
          type="text"
          placeholder="Search PDFs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>
      <div className="space-y-4">
        {searchResults.map((result) => (
          <div key={result.id} className="border p-4 rounded-md">
            <h3 className="font-bold">{result.title}</h3>
            <p>{result.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
