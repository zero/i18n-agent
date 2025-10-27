'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Language = {
  id: string;
  code: string;
  name: string;
};

type Translation = {
  id: string;
  key: string;
  languageId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
  language: Language;
};

export default function TranslationsPage() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] =
    useState<Translation | null>(null);
  const [searchKey, setSearchKey] = useState('');
  const [filterLanguageId, setFilterLanguageId] = useState<string>('all');
  const [formData, setFormData] = useState({
    key: '',
    languageId: '',
    value: '',
  });

  const fetchLanguages = async () => {
    try {
      const res = await fetch('/api/languages');
      const data = await res.json();
      if (data.success) {
        setLanguages(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch languages:', error);
    }
  };

  const fetchTranslations = async () => {
    try {
      const params = new URLSearchParams();
      if (searchKey) params.append('key', searchKey);
      if (filterLanguageId && filterLanguageId !== 'all') {
        params.append('languageId', filterLanguageId);
      }

      const res = await fetch(`/api/translations?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTranslations(data.data.translations);
      }
    } catch (error) {
      console.error('Failed to fetch translations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  useEffect(() => {
    fetchTranslations();
  }, [searchKey, filterLanguageId]);

  const handleCreate = () => {
    setEditingTranslation(null);
    setFormData({ key: '', languageId: '', value: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (translation: Translation) => {
    setEditingTranslation(translation);
    setFormData({
      key: translation.key,
      languageId: translation.languageId,
      value: translation.value,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条翻译吗？')) return;

    try {
      const res = await fetch(`/api/translations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchTranslations();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingTranslation
        ? `/api/translations/${editingTranslation.id}`
        : '/api/translations';
      const method = editingTranslation ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setIsDialogOpen(false);
        fetchTranslations();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  if (loading) {
    return <div className="py-8 text-center">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">翻译管理</h1>
          <p className="text-muted-foreground">管理各语言下的翻译文本</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          添加翻译
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="搜索翻译 key..."
            className="pl-8"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
          />
        </div>
        <Select value={filterLanguageId} onValueChange={setFilterLanguageId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="筛选语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有语言</SelectItem>
            {languages.map((lang) => (
              <SelectItem key={lang.id} value={lang.id}>
                {lang.name} ({lang.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>语言</TableHead>
              <TableHead>翻译文本</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {translations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground text-center"
                >
                  暂无翻译数据
                </TableCell>
              </TableRow>
            ) : (
              translations.map((translation) => (
                <TableRow key={translation.id}>
                  <TableCell className="font-mono text-sm">
                    {translation.key}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {translation.language.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {translation.value}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(translation)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(translation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTranslation ? '编辑翻译' : '添加翻译'}
            </DialogTitle>
            <DialogDescription>
              {editingTranslation ? '修改翻译内容' : '添加一条新的翻译'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="key">翻译 Key</Label>
                <Input
                  id="key"
                  placeholder="例如：common.welcome, button.submit"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="language">语言</Label>
                <Select
                  value={formData.languageId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, languageId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择语言" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        {lang.name} ({lang.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="value">翻译文本</Label>
                <Textarea
                  id="value"
                  placeholder="输入翻译内容..."
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  rows={5}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
