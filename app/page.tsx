import React from 'react';
import Link from 'next/link';
import { Languages, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Page() {
  return (
    <div className="from-background to-muted flex min-h-screen flex-col items-center justify-center bg-gradient-to-b">
      <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
        <Languages className="text-primary h-16 w-16" />
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          i18n Agent
        </h1>
        <p className="text-muted-foreground max-w-[42rem] leading-normal sm:text-xl sm:leading-8">
          AI 驱动的国际化翻译管理系统
        </p>
        <div className="flex gap-4">
          <Link href="/admin">
            <Button size="lg">
              进入管理后台
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
