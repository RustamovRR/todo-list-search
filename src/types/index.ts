export interface User {
  id: string
  email: string
  name: string
  organizationId?: string
  role: 'admin' | 'user'
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  ownerId: string
  members: string[] // user IDs
  createdAt: Date
  updatedAt: Date
}

export interface DocumentType {
  id: string
  title: string
  content: string
  userId: string
  organizationId: string
  uploadedBy: string
  createdAt: Date
  updatedAt: Date
}

export interface DocumentPart {
  id: string
  content: string
  partNumber: number
  isSaved: boolean
}

export interface SearchResultType {
  id: string
  title: string
  content: string
  context: string
  score: number
  position: {
    paragraph: number
    offset: number
  }
  highlight: string
}
