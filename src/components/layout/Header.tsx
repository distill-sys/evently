'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Ticket, LogIn, UserPlus, LogOut, UserCircle2, Settings, Briefcase } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { user, role, logout } = useAuth();

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Ticket className="h-8 w-8 text-primary" />
          <span className="text-2xl font-headline font-semibold text-primary">Evently</span>
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              {role === 'attendee' && (
                <Button variant="ghost" asChild>
                  <Link href="/attendee">Browse Events</Link>
                </Button>
              )}
               {role === 'organizer' && (
                <Button variant="ghost" asChild>
                  {/* Placeholder for organizer dashboard/events page */}
                  <Link href={`/organizer/${user.id}`}>My Dashboard</Link>
                </Button>
              )}
              {role === 'admin' && (
                <Button variant="ghost" asChild>
                  <Link href="/admin">Admin Panel</Link>
                </Button>
              )}
              {!role && user && ( // If logged in but role not selected yet (on /dashboard)
                <span className="text-sm text-muted-foreground">Welcome, {user.name}!</span>
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
                    <DropdownMenuItem asChild className="font-body cursor-pointer">
                      <Link href="/attendee/profile"><Settings className="mr-2 h-4 w-4" />Profile & Cards</Link>
                    </DropdownMenuItem>
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
                   {!role && ( // If on dashboard page before role selection
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
              <Button variant="ghost" asChild>
                <Link href="/attendee">Browse Events</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Login</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up"><UserPlus className="mr-2 h-4 w-4" />Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
