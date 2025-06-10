'use client';

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground border-t mt-auto">
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-sm font-body">
          &copy; {new Date().getFullYear()} Evently. All rights reserved.
        </p>
        <div className="mt-2 space-x-4 font-body">
          <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
          <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}

// Create dummy pages for footer links to avoid 404s
// These can be fleshed out later.
export function AboutPage() {
  return <div className="py-8"><h1 className="text-3xl font-headline">About Evently</h1><p className="font-body mt-4">Evently is your premier platform for discovering and managing events.</p></div>;
}
export function ContactPage() {
  return <div className="py-8"><h1 className="text-3xl font-headline">Contact Us</h1><p className="font-body mt-4">Get in touch with the Evently team.</p></div>;
}
export function PrivacyPolicyPage() {
  return <div className="py-8"><h1 className="text-3xl font-headline">Privacy Policy</h1><p className="font-body mt-4">Read about how we handle your data.</p></div>;
}
