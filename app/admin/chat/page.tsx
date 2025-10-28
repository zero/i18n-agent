'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  needsConfirmation?: boolean;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmButtons, setShowConfirmButtons] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        const assistantMessageId = (Date.now() + 1).toString();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantMessage += chunk;

          // 检查是否需要确认
          const needsConfirm = assistantMessage.includes('[CONFIRM_REQUIRED]');
          const cleanContent = assistantMessage
            .replace('[CONFIRM_REQUIRED]', '')
            .trim();

          // 更新助手消息
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.id === assistantMessageId) {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: cleanContent,
                  needsConfirmation: needsConfirm,
                },
              ];
            } else {
              return [
                ...prev,
                {
                  id: assistantMessageId,
                  role: 'assistant' as const,
                  content: cleanContent,
                  needsConfirmation: needsConfirm,
                },
              ];
            }
          });

          // 如果需要确认，显示按钮
          if (needsConfirm) {
            setShowConfirmButtons(true);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '抱歉，发生了错误。请稍后重试。',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (confirmed: boolean) => {
    setShowConfirmButtons(false);
    const confirmMessage = confirmed ? '确认' : '取消';

    // 自动发送确认或取消消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: confirmMessage,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        const assistantMessageId = (Date.now() + 1).toString();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantMessage += chunk;

          const cleanContent = assistantMessage
            .replace('[CONFIRM_REQUIRED]', '')
            .trim();

          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.id === assistantMessageId) {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: cleanContent },
              ];
            } else {
              return [
                ...prev,
                {
                  id: assistantMessageId,
                  role: 'assistant' as const,
                  content: cleanContent,
                },
              ];
            }
          });
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '抱歉，发生了错误。请稍后重试。',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI 翻译助手</h1>
        <p className="text-muted-foreground">
          通过对话快速管理和创建 i18n 翻译
        </p>
      </div>

      {/* 对话区域 */}
      <Card className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* 消息列表 */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-center">
                <div className="space-y-2">
                  <Bot className="text-muted-foreground mx-auto h-12 w-12" />
                  <h3 className="text-lg font-medium">开始对话</h3>
                  <p className="text-muted-foreground text-sm">
                    试试说：&ldquo;帮我翻译常用文本&lsquo;同意&rsquo;&rdquo;
                  </p>
                  <div className="text-muted-foreground mt-4 space-y-2 text-left text-sm">
                    <p>💡 你可以这样说：</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>
                        &ldquo;帮我添加一个&lsquo;提交&rsquo;按钮的翻译&rdquo;
                      </li>
                      <li>
                        &ldquo;翻译&lsquo;欢迎来到我们的网站&rsquo;到所有语言&rdquo;
                      </li>
                      <li>&ldquo;查看 common.welcome 的翻译&rdquo;</li>
                      <li>&ldquo;列出所有支持的语言&rdquo;</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <Bot className="text-primary-foreground h-5 w-5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Bot className="text-primary-foreground h-5 w-5" />
                </div>
                <div className="bg-muted flex items-center gap-2 rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">
                    正在思考...
                  </span>
                </div>
              </div>
            )}

            {/* 确认按钮 */}
            {showConfirmButtons && !isLoading && (
              <div className="flex gap-3">
                <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Bot className="text-primary-foreground h-5 w-5" />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleConfirm(true)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✓ 确认创建
                  </Button>
                  <Button
                    onClick={() => handleConfirm(false)}
                    size="sm"
                    variant="outline"
                  >
                    ✗ 取消
                  </Button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入你的需求..."
                disabled={isLoading || showConfirmButtons}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim() || showConfirmButtons}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            {showConfirmButtons && (
              <p className="text-muted-foreground mt-2 text-xs">
                请先确认或取消上面的操作
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
