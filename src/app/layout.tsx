
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
// import { Loader2 } from 'lucide-react'; // Optional: for global loading state

export const metadata: Metadata = {
  title: 'Evently - Find Your Next Event',
  description: 'Discover and manage events with Evently.',
  icons: [], // Explicitly define an empty array for icons
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <AuthProvider>
          {/* 
            The AuthProvider now handles its own loading state internally.
            If you want a very prominent global loader during initial auth check,
            you could conditionally render it here based on a context value,
            but the current AuthProvider setup shows children once loading is false.
          */}
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
