'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
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

type Language = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    translations: number;
  };
};

export default function LanguagesPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    isActive: true,
    isDefault: false,
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  const handleCreate = () => {
    setEditingLanguage(null);
    setFormData({ code: '', name: '', isActive: true, isDefault: false });
    setIsDialogOpen(true);
  };

  const handleEdit = (language: Language) => {
    setEditingLanguage(language);
    setFormData({
      code: language.code,
      name: language.name,
      isActive: language.isActive,
      isDefault: language.isDefault,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个语言吗？相关的翻译也会被删除。')) return;

    try {
      const res = await fetch(`/api/languages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchLanguages();
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
      const url = editingLanguage
        ? `/api/languages/${editingLanguage.id}`
        : '/api/languages';
      const method = editingLanguage ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setIsDialogOpen(false);
        fetchLanguages();
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
          <h1 className="text-3xl font-bold tracking-tight">语言管理</h1>
          <p className="text-muted-foreground">管理系统支持的语言列表</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          添加语言
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>语言代码</TableHead>
              <TableHead>语言名称</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>翻译数量</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {languages.map((language) => (
              <TableRow key={language.id}>
                <TableCell className="font-mono">{language.code}</TableCell>
                <TableCell>{language.name}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {language.isDefault && (
                      <Badge variant="default">默认</Badge>
                    )}
                    {language.isActive ? (
                      <Badge variant="secondary">
                        <Check className="mr-1 h-3 w-3" />
                        启用
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <X className="mr-1 h-3 w-3" />
                        禁用
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{language._count?.translations || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(language)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(language.id)}
                      disabled={language.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLanguage ? '编辑语言' : '添加语言'}
            </DialogTitle>
            <DialogDescription>
              {editingLanguage ? '修改语言信息' : '添加一个新的支持语言'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="code">语言代码</Label>
                <Input
                  id="code"
                  placeholder="例如：en, zh-CN, ja"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">语言名称</Label>
                <Input
                  id="name"
                  placeholder="例如：English, 简体中文"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive">启用此语言</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="isDefault">设为默认语言</Label>
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
