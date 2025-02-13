'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'

export function GoogleSignInButton() {
  const searchParams = useSearchParams()

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', {
        callbackUrl: searchParams?.get('from') || '/',
      })
    } catch (error) {
      toast.error('Google orqali kirishda xatolik yuz berdi')
    }
  }

  return (
    <button
      onClick={handleGoogleSignIn}
      className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
    >
      <Image
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
        width={20}
        height={20}
      />
      Google orqali kirish
    </button>
  )
}
