// app/api/documents/[id]/route.ts
import { db } from '@/lib/firebase'
import { doc, updateDoc, deleteDoc, serverTimestamp } from '@firebase/firestore'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { title, content } = await req.json()
    const docRef = doc(db, 'documents', params.id)

    await updateDoc(docRef, {
      title,
      content,
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

// Dokumentni o'chirish
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const docRef = doc(db, 'documents', params.id)
    await deleteDoc(docRef)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
