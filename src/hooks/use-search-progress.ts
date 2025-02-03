import { useState } from 'react'

interface SearchProgressState {
  isLoading: boolean
  progress: number
  totalPages: number
  currentPage: number
  status: string
}

export function useSearchProgress() {
  const [state, setState] = useState<SearchProgressState>({
    isLoading: false,
    progress: 0,
    totalPages: 0,
    currentPage: 0,
    status: '',
  })

  const startLoading = (status: string) => {
    setState((prev) => ({ ...prev, isLoading: true, status }))
  }

  const updateProgress = (progress: number, status?: string) => {
    setState((prev) => ({
      ...prev,
      progress,
      status: status || prev.status,
    }))
  }

  const updatePages = (current: number, total: number) => {
    setState((prev) => ({
      ...prev,
      currentPage: current,
      totalPages: total,
    }))
  }

  const reset = () => {
    setState({
      isLoading: false,
      progress: 0,
      totalPages: 0,
      currentPage: 0,
      status: '',
    })
  }

  return {
    ...state,
    startLoading,
    updateProgress,
    updatePages,
    reset,
  }
}
