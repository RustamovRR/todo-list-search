'use client'

import React, { useState } from 'react'
import { Button } from '../ui/button'
import { FileText } from 'lucide-react'
import { DocumentsDialog } from './DocumentsDialog'

const Header = () => {
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false)

  return (
    <div className="flex items-center gap-12">
      <h1 className="text-4xl font-bold">Logo</h1>
      <Button variant="secondary" className="flex items-center gap-2" onClick={() => setIsDocumentsOpen(true)}>
        <FileText className="h-4 w-4" />
        Mening hujjatlarim
      </Button>

      <DocumentsDialog open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen} />
    </div>
  )
}

export default Header
