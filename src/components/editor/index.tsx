'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const EditorLexical = dynamic(() => import('./Editor').then((mod) => mod.default), {
  loading: () => (
    <div className="h-[40vh] w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Editor yuklanmoqda...</p>
      </div>
    </div>
  ),
  ssr: false,
})

export default EditorLexical
