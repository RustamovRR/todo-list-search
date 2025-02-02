'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { debounce } from 'lodash-es'
import { documentDB } from '@/lib/db'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import { DialogTitle } from '@radix-ui/react-dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

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

export default function SearchSection() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Qidiruv navigatsiyasi uchun state'lar
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleSearch = debounce(async (term: string) => {
    console.log('🔍 Search Term:', {
      term,
      length: term.length,
      timestamp: new Date().toISOString(),
    })

    if (!term.trim()) {
      setResults([])
      return
    }

    console.log('🔍 Searching for:', term)

    setIsLoading(true)
    try {
      const searchResults = await documentDB.searchDocuments(term)
      console.log('✨ Search Results:', searchResults)
      setResults(searchResults)
    } catch (error) {
      console.error('❌ Search Error:', error)
    } finally {
      setIsLoading(false)
    }
  }, 300)

  const handleResultClick = (result: SearchResult) => {
    console.log('👆 Opening preview for:', {
      title: result.title,
      paragraphs: result.content.split('\n').length,
      matchedParagraph: result.position.paragraph,
    })
    setSelectedResult(result)
    setIsPreviewOpen(true)
    // Modal ochilganda currentMatchIndex ni reset qilish
    setCurrentMatchIndex(0)
  }

  // Highlight all occurrences of search terms in text
  const highlightSearchTerms = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text

    const terms = searchTerm.trim().toLowerCase().split(/\s+/)
    let highlightedText = text

    terms.forEach((term) => {
      if (term.length < 2) return // Skip short terms

      const regex = new RegExp(`(${term})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="search-match">$1</mark>')
    })

    return highlightedText
  }

  // Format full content with highlights and navigation
  const formatFullContent = (content: string, searchTerm: string) => {
    content = content.replace(/[\r\n\t\f\v ]+/g, ' ')
    content = content.replace(/\s+/g, ' ').trim()

    const sentences = content.split(/(?<=[.!?])\s+/)
    let matchCount = 0

    const highlightedSentences = sentences.map((sentence) => {
      let highlightedText = sentence

      if (searchTerm.trim()) {
        const terms = searchTerm.trim().toLowerCase().split(/\s+/)
        terms.forEach((term) => {
          if (term.length < 2) return
          const regex = new RegExp(`(${term})`, 'gi')
          highlightedText = highlightedText.replace(regex, (match, p1) => {
            matchCount++
            return `<mark id="search-match-${matchCount}" class="search-match">${p1}</mark>`
          })
        })
      }

      return highlightedText
    })

    setTimeout(() => setTotalMatches(matchCount), 0)

    return `
      <div class="w-full">
        <p class="text-justify whitespace-normal break-words leading-relaxed hyphens-auto">
          ${highlightedSentences.join(' ')}
        </p>
      </div>
    `
  }

  // Navigatsiya funksiyalari
  const scrollToMatch = (index: number) => {
    if (!previewRef.current) return

    // Oldingi highlight'ni o'chirish
    const prevMatches = previewRef.current.querySelectorAll('.search-match-focused')
    prevMatches.forEach((match) => {
      match.classList.remove('search-match-focused')
    })

    // Yangi match'ni topish va focus qilish
    const match = previewRef.current.querySelector(`#search-match-${index + 1}`)
    if (match) {
      // Yangi highlight qo'shish
      match.classList.add('search-match-focused')
      // Smooth scroll
      match.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setCurrentMatchIndex(index)
    }
  }

  const goToNextMatch = () => {
    const nextIndex = (currentMatchIndex + 1) % totalMatches
    scrollToMatch(nextIndex)
  }

  const goToPrevMatch = () => {
    const prevIndex = (currentMatchIndex - 1 + totalMatches) % totalMatches
    scrollToMatch(prevIndex)
  }

  // Modal ochilganda birinchi elementga focus
  useEffect(() => {
    if (isPreviewOpen && previewRef.current) {
      // Birinchi elementga focus
      scrollToMatch(0)
    }
  }, [isPreviewOpen])

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search in documents..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            handleSearch(e.target.value)
          }}
          className="flex-1"
        />
        {isLoading && <Loader2 className="animate-spin" />}
      </div>

      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={`${result.id}-${index}`}
            onClick={() => handleResultClick(result)}
            className="group p-4 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-medium group-hover:text-accent-foreground">{result.title}</h3>
              <Badge variant="secondary" className="ml-2">
                Preview
              </Badge>
            </div>
            <div
              className="text-sm text-muted-foreground mt-2 line-clamp-2"
              dangerouslySetInnerHTML={{
                __html: highlightSearchTerms(result.context, searchTerm),
              }}
            />
          </div>
        ))}
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[85vh]">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">{selectedResult?.title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Showing matches for "{searchTerm}"</p>
              </div>

              {totalMatches > 0 && (
                <div className="flex items-center gap-2 mr-10">
                  <Button
                    variant="outline"
                    onClick={goToPrevMatch}
                    disabled={totalMatches <= 1}
                    className="w-8 h-8 rounded-full"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>

                  <span className="text-sm">
                    {currentMatchIndex + 1}/{totalMatches}
                  </span>

                  <Button
                    variant="outline"
                    onClick={goToNextMatch}
                    disabled={totalMatches <= 1}
                    className="w-8 h-8 rounded-full"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedResult && (
            <ScrollArea className="h-[calc(85vh-8rem)] pr-4">
              <div className="w-full max-w-none">
                <div
                  ref={previewRef}
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: formatFullContent(selectedResult.content, searchTerm),
                  }}
                />
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
