'use client'

import React, { useState } from 'react'
import { Button } from '../ui/button'
import { FileText, LogOut, User } from 'lucide-react'
import { DocumentsDialog } from './DocumentsDialog'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import toast from 'react-hot-toast'

const Header = () => {
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false)
  const { data: session } = useSession()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Tizimdan chiqildi')
    } catch (error) {
      toast.error('Xatolik yuz berdi')
    }
  }

  return (
    <header>
      <div className="flex h-12 items-center justify-between mx-4">
        <Link href="/" className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="font-bold">BookSearch</span>
        </Link>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <Button variant="secondary" className="flex items-center gap-2" onClick={() => setIsDocumentsOpen(true)}>
                <FileText className="h-4 w-4" />
                Barcha fayllar
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                      <AvatarFallback>{session.user.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem className="flex-col items-start">
                    <div className="text-sm font-medium">{session.user.name}</div>
                    <div className="text-xs text-muted-foreground">{session.user.email}</div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Chiqish</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild>
              <Link href="/auth/signin">
                <User className="mr-2 h-4 w-4" /> Kirish
              </Link>
            </Button>
          )}
        </div>
      </div>

      <DocumentsDialog open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen} />
    </header>
  )
}

export default Header
