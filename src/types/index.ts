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

export interface Document {
  id: string
  title: string
  content: string
  organizationId: string
  uploadedBy: string
  createdAt: Date
  updatedAt: Date
}
