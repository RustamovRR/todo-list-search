import { create } from 'zustand'

interface EditorState {
  partsCount: number
  setPartsCount: (count: number) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  partsCount: 0,
  setPartsCount: (count: number) =>
    set({
      partsCount: count,
    }),
}))
