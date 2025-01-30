'use client'

import dynamic from 'next/dynamic'

const EditorLexical = dynamic(() => import('./Editor').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div>Loading editor...</div>,
})

export default EditorLexical
