import { useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronUp, ChevronDown } from 'lucide-react'

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

interface SearchPreviewProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  result: SearchResult | null
  searchTerm: string
  currentMatchIndex: number
  totalMatches: number
  onNavigate: (direction: 'prev' | 'next') => void
  formatContent: (content: string, searchTerm: string) => string
}

export function SearchPreview({
  isOpen,
  onOpenChange,
  result,
  searchTerm,
  currentMatchIndex,
  totalMatches,
  onNavigate,
  formatContent,
}: SearchPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && previewRef.current) {
      const marks = previewRef.current.querySelectorAll('mark')
      if (marks[currentMatchIndex]) {
        marks[currentMatchIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }
  }, [isOpen, currentMatchIndex])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh]">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">{result?.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Showing matches for "{searchTerm}"</p>
            </div>

            {totalMatches > 0 && (
              <div className="flex items-center gap-2 mr-10">
                <Button
                  variant="outline"
                  onClick={() => onNavigate('prev')}
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
                  onClick={() => onNavigate('next')}
                  disabled={totalMatches <= 1}
                  className="w-8 h-8 rounded-full"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* {selectedResult && ( */}
          <ScrollArea className="h-[calc(85vh-8rem)] pr-4">
            <div className="w-full max-w-none">
              <div
                ref={previewRef}
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: formatContent(result?.context as string, searchTerm),
                }}
              />
            </div>
          </ScrollArea>
        {/* )} */}
      </DialogContent>
    </Dialog>
  )
}
