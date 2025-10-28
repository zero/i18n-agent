import React from 'react';
import Link from 'next/link';
import { Languages, FileText } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="container mx-auto flex h-14 items-center px-4">
          <div className="mr-4 flex">
            <Link href="/admin" className="mr-6 flex items-center space-x-2">
              <Languages className="h-6 w-6" />
              <span className="hidden font-bold sm:inline-block">
                i18n Agent
              </span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/admin/chat"
              className="hover:text-foreground/80 text-foreground transition-colors"
            >
              AI 助手
            </Link>
            <Link
              href="/admin/languages"
              className="hover:text-foreground/80 text-foreground transition-colors"
            >
              语言管理
            </Link>
            <Link
              href="/admin/translations"
              className="hover:text-foreground/80 text-foreground transition-colors"
            >
              翻译管理
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:h-14 md:flex-row">
          <p className="text-muted-foreground text-center text-sm leading-loose md:text-left">
            Built with Next.js, Prisma, and Shadcn UI
          </p>
        </div>
      </footer>
    </div>
  );
}
