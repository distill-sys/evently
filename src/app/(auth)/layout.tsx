import type React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center py-12">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-2xl">
        {children}
      </div>
    </div>
  );
}
