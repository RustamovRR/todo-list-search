// app/api/documents/route.ts
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from '@firebase/firestore'
import { NextResponse } from 'next/server'

// Yangi document yaratish
export async function POST(req: Request) {
  try {
    const { title, content } = await req.json()

    const docRef = await addDoc(collection(db, 'documents'), {
      title,
      content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      id: docRef.id,
    })
  } catch (error) {
    console.error('Error adding document:', error)
    return NextResponse.json({ error: 'Failed to add document' }, { status: 500 })
  }
}

// Barcha dokumentlarni olish
export async function GET() {
  try {
    const q = query(collection(db, 'documents'), orderBy('updatedAt', 'desc'))

    const querySnapshot = await getDocs(q)
    const documents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error getting documents:', error)
    return NextResponse.json({ error: 'Failed to get documents' }, { status: 500 })
  }
}
