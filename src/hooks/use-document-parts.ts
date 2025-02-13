import { useState } from 'react'
import { DocumentPart } from '@/types'
import { nanoid } from 'nanoid'

export function useDocumentParts() {
  const [parts, setParts] = useState<DocumentPart[]>([])
  const [currentPartIndex, setCurrentPartIndex] = useState(0)

  const addPart = (content: string) => {
    const newPart: DocumentPart = {
      id: nanoid(),
      content,
      partNumber: parts.length + 1,
      isSaved: false
    }
    setParts([...parts, newPart])
  }

  const updatePart = (partId: string, content: string) => {
    setParts(parts.map(part => 
      part.id === partId ? { ...part, content, isSaved: false } : part
    ))
  }

  const markPartAsSaved = (partId: string) => {
    setParts(parts.map(part => 
      part.id === partId ? { ...part, isSaved: true } : part
    ))
  }

  const clearPart = (partId: string) => {
    setParts(parts.map(part => 
      part.id === partId ? { ...part, content: '', isSaved: false } : part
    ))
  }

  const removePart = (partId: string) => {
    setParts(parts.filter(part => part.id !== partId))
  }

  const setPartContent = (partId: string, content: string) => {
    setParts(parts.map(part => 
      part.id === partId ? { ...part, content } : part
    ))
  }

  return {
    parts,
    currentPartIndex,
    setCurrentPartIndex,
    addPart,
    updatePart,
    markPartAsSaved,
    clearPart,
    removePart,
    setPartContent
  }
}
