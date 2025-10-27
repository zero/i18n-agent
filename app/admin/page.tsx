import React from 'react';
import Link from 'next/link';
import { Languages, FileText, ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">管理后台</h1>
        <p className="text-muted-foreground">管理系统支持的语言和翻译内容</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Languages className="text-primary h-5 w-5" />
              <CardTitle>语言管理</CardTitle>
            </div>
            <CardDescription>
              管理系统支持的语言列表，配置默认语言和启用状态
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/languages">
              <Button className="w-full">
                进入管理
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileText className="text-primary h-5 w-5" />
              <CardTitle>翻译管理</CardTitle>
            </div>
            <CardDescription>管理各语言下的翻译文本内容</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/translations">
              <Button className="w-full">
                进入管理
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
