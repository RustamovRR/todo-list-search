import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

interface SearchProgressProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  progress: number
  status: string
  currentPage?: number
  totalPages?: number
}

export function SearchProgress({
  isOpen,
  onOpenChange,
  progress,
  status,
  currentPage,
  totalPages,
}: SearchProgressProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{status}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Progress value={progress} className="w-full" />
          {totalPages && totalPages > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
