
'use client';

import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button'; 
import { useAuth } from '@/contexts/AuthContext';
import { Ticket, LogIn, UserPlus, LogOut, UserCircle2, Settings, Briefcase, ListOrdered } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

const getButtonClasses = (props: VariantProps<typeof buttonVariants>) => cn(buttonVariants(props));


export default function Header() {
  const { user, role, logout } = useAuth();

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Ticket className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-semibold text-primary">Evently</span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
          {user ? (
            <>
              {role === 'attendee' && (
                <Link href="/attendee" className={getButtonClasses({ variant: "ghost" })}>Browse Events</Link>
              )}
               {role === 'organizer' && (
                <Link href={`/organizer/${user.id}`} className={getButtonClasses({ variant: "ghost" })}>My Dashboard</Link>
              )}
              {role === 'admin' && (
                <Link href="/admin" className={getButtonClasses({ variant: "ghost" })}>Admin Panel</Link>
              )}
              {!role && user && ( 
                <span className="text-sm text-muted-foreground hidden md:inline">Welcome, {user.name}!</span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <UserCircle2 className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-body">My Account ({user.name})</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {role === 'attendee' && (
                    <>
                      <DropdownMenuItem asChild className="font-body cursor-pointer">
                        <Link href="/attendee/profile"><Settings className="mr-2 h-4 w-4" />Profile & Cards</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="font-body cursor-pointer">
                        <Link href="/attendee/tickets"><ListOrdered className="mr-2 h-4 w-4" />My Tickets</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {role === 'organizer' && (
                     <DropdownMenuItem asChild className="font-body cursor-pointer">
                      <Link href={`/organizer/${user.id}`}><Briefcase className="mr-2 h-4 w-4" />Organizer Profile</Link>
                    </DropdownMenuItem>
                  )}
                  {role && (
                    <DropdownMenuItem onSelect={() => logout()} className="font-body cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  )}
                   {!role && ( 
                     <DropdownMenuItem onSelect={() => logout()} className="font-body cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/attendee" className={getButtonClasses({ variant: "ghost", size: "default" }) + " hidden sm:inline-flex"}>Browse Events</Link>
              <Link href="/login" className={getButtonClasses({ variant: "outline", size: "default" })}>
                <LogIn className="mr-0 sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">Login</span>
              </Link>
              <Link href="/sign-up" className={getButtonClasses({ variant: "default", size: "default" })}>
                <UserPlus className="mr-0 sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">Sign Up</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
