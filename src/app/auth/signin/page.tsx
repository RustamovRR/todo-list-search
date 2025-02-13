'use client'

import Link from 'next/link'
import { SignInForm } from '@/components/auth/signin-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthenticationPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex flex-col h-full">
          <div className="flex items-center text-lg font-medium mb-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            BookSearch
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold mt-12">PDF Fayllarni Qidiruv Tizimi</h1>
            <p className="text-lg text-zinc-300">
              BookSearch yordamida siz PDF fayllaringizdagi ma'lumotlarni tez va oson topishingiz mumkin. Fayllarni
              yuklang va Google kabi qidiruv tizimidan foydalaning.
            </p>
            <ul className="space-y-4 text-zinc-300">
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                PDF fayllarni yuklash va indekslash
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Tez va aniq qidiruv
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Jamoaviy hujjatlar bilan ishlash
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Kirish</CardTitle>
              <CardDescription className="text-center">
                Tizimga kirish uchun quyidagi usullardan birini tanlang
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <SignInForm />
            </CardContent>
            {/* <CardFooter>
              <Button variant="ghost" className="w-full">
                <Link href="/auth/signup">Ro'yxatdan o'tish</Link>
              </Button>
            </CardFooter> */}
          </Card>
        </div>
      </div>
    </div>
  )
}
