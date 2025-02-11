import { db } from '@/lib/firebase'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { NextResponse } from 'next/server'

// GET - indekslangan ma'lumotlarni olish
export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(db, 'documents'))
    const documents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

// POST - yangi ma'lumotni saqlash
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, content, index } = body

    await setDoc(doc(db, 'documents', id), {
      content,
      index,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving document:', error)
    return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
  }
}
