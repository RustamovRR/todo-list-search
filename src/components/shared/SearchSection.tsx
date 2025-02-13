'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { debounce } from 'lodash-es'
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog'
import { DialogTitle } from '@radix-ui/react-dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { useSearchProgress } from '@/hooks/use-search-progress'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { highlightSearchTerms, formatFullContent } from '@/lib/search-utils'
import { documentService } from '@/lib/document-service'

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
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Qidiruv navigatsiyasi uchun state'lar
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  const previewRef = useRef<HTMLDivElement>(null)

  const { isLoading, progress, status, currentPage, totalPages, startLoading, updateProgress, updatePages, reset } =
    useSearchProgress()

  const handleSearch = debounce(async (term: string) => {
    if (!term.trim()) {
      setResults([])
      return
    }

    if (!session?.user?.id) {
      toast.error('Qidiruv uchun tizimga kirishingiz kerak')
      return
    }

    startLoading('Searching...')
    try {
      const searchResults = await documentService.searchDocuments(term, session.user.id)
      setResults(searchResults)
    } catch (error) {
      console.error('Search Error:', error)
    } finally {
      reset()
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

  // Highlight qilingan matnda nechta match borligini hisoblash
  const countMatches = (content: string) => {
    const matches = content.match(/<mark class="search-match">/g)
    return matches ? matches.length : 0
  }

  useEffect(() => {
    if (selectedResult && searchTerm) {
      const highlightedContent = formatFullContent(selectedResult.content, searchTerm)
      const matches = countMatches(highlightedContent)
      setTotalMatches(matches)
    }
  }, [selectedResult, searchTerm])

  // Throttle scroll function
  const throttledScroll = useCallback(
    debounce((index: number) => {
      const scrollViewport = previewRef.current?.querySelector('[data-radix-scroll-area-viewport]')
      const matches = scrollViewport?.querySelectorAll('.search-match')

      if (scrollViewport && matches?.[index]) {
        const scrollContainer = scrollViewport.parentElement
        if (scrollContainer) {
          const containerHeight = scrollContainer.getBoundingClientRect().height
          const matchTop = matches[index].getBoundingClientRect().top
          const containerTop = scrollContainer.getBoundingClientRect().top
          const scrollTop = matchTop - containerTop - containerHeight / 2

          // Remove previous focus
          scrollViewport.querySelector('.search-match-focused')?.classList.remove('search-match-focused')

          // Scroll and focus
          scrollViewport.scrollTop = scrollTop
          matches[index].classList.add('search-match-focused')
        }
      }
    }, 100),
    [],
  )

  // Batch size for pagination
  const MATCHES_PER_BATCH = 50
  const [visibleMatches, setVisibleMatches] = useState<number>(MATCHES_PER_BATCH)

  const goToNextMatch = () => {
    const nextIndex = (currentMatchIndex + 1) % totalMatches

    // Load more matches if we're near the end of current batch
    if (nextIndex >= visibleMatches - 10 && visibleMatches < totalMatches) {
      setVisibleMatches((prev) => Math.min(prev + MATCHES_PER_BATCH, totalMatches))
    }

    setCurrentMatchIndex(nextIndex)
    throttledScroll(nextIndex)
  }

  const goToPrevMatch = () => {
    const prevIndex = (currentMatchIndex - 1 + totalMatches) % totalMatches
    setCurrentMatchIndex(prevIndex)
    throttledScroll(prevIndex)
  }

  // Modal ochilganda kontentni highlight qilish va scroll
  useEffect(() => {
    if (isPreviewOpen && selectedResult && searchTerm) {
      // Highlight qilingan kontentni olish
      const highlightedContent = formatFullContent(selectedResult.content, searchTerm)
      const matches = countMatches(highlightedContent)
      setTotalMatches(matches)
      setVisibleMatches(MATCHES_PER_BATCH)
      setCurrentMatchIndex(0)

      // DOM yangilanishini kutish
      setTimeout(() => {
        const scrollViewport = previewRef.current?.querySelector('[data-radix-scroll-area-viewport]')
        const firstMatch = scrollViewport?.querySelector('.search-match')

        if (scrollViewport && firstMatch) {
          const scrollContainer = scrollViewport.parentElement
          if (scrollContainer) {
            const containerHeight = scrollContainer.getBoundingClientRect().height
            const matchTop = firstMatch.getBoundingClientRect().top
            const containerTop = scrollContainer.getBoundingClientRect().top
            const scrollTop = matchTop - containerTop - containerHeight / 2

            scrollViewport.scrollTop = scrollTop
            firstMatch.classList.add('search-match-focused')
          }
        }
      }, 100)
    }
  }, [isPreviewOpen, selectedResult, searchTerm])

  return (
    <div className="h-full flex flex-col rounded-lg border bg-background shadow">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 px-4 py-2.5 border-b">
          <Input
            type="search"
            placeholder="Hujjatdan qidirish..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              handleSearch(e.target.value)
            }}
            className="w-full h-10"
          />
        </div>

        <div className="flex-grow p-4 overflow-auto">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchTerm && results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-lg font-medium">Natija topilmadi</p>
                <p className="text-sm">Boshqa kalit so'z bilan qidirib ko'ring</p>
              </div>
            ) : !searchTerm ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-lg font-medium">Qidirishni boshlang</p>
                <p className="text-sm">Hujjat ichidan qidirish uchun matn kiriting</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mt-1">"{searchTerm}" so'zi bo'yicha natijalar</p>
                {results.map((result, index) => (
                  <div
                    key={`${result.id}-${index}`}
                    onClick={() => handleResultClick(result)}
                    className="group p-4 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{result.title}</div>
                        <div
                          className="text-sm text-muted-foreground mt-1"
                          dangerouslySetInnerHTML={{
                            __html: highlightSearchTerms(result.context, searchTerm),
                          }}
                        />
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {Math.round(result.score * 100)}% mos
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[85vh]">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">{selectedResult?.title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">"{searchTerm}" so'zi bo'yicha mosliklar</p>
              </div>

              {totalMatches > 0 && (
                <div className="flex items-center gap-2 mr-10">
                  <Button
                    variant="outline"
                    onClick={goToPrevMatch}
                    disabled={totalMatches < 1}
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
                    disabled={totalMatches < 1}
                    className="w-8 h-8 rounded-full"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedResult && (
            <ScrollArea className="h-[calc(85vh-8rem)] pr-4" ref={previewRef}>
              <div className="w-full max-w-none">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: `<div class="w-full">
                      <p class="text-justify whitespace-normal break-words leading-relaxed hyphens-auto">
                        ${formatFullContent(selectedResult.content, searchTerm)
                          .split('<mark class="search-match">')
                          .slice(0, visibleMatches)
                          .join('<mark class="search-match">')}
                      </p>
                    </div>`,
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
