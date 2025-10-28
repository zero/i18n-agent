import { NextRequest } from 'next/server';
import { createAgentExecutor } from '@/lib/agent/executor';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

export const runtime = 'nodejs';
export const maxDuration = 60; // 最长运行 60 秒

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request body', { status: 400 });
    }

    // 获取最后一条用户消息
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response('Last message must be from user', { status: 400 });
    }

    // 转换历史消息为 LangChain 格式
    const chatHistory = messages.slice(0, -1).map((msg: any) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    });

    // 创建 Agent Executor
    const executor = await createAgentExecutor();

    // 执行 Agent（使用流式输出）
    const stream = await executor.stream({
      input: lastMessage.content,
      chat_history: chatHistory,
    });

    // 创建流式响应
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // 只返回最终输出，不返回中间步骤
            if (chunk.output) {
              controller.enqueue(encoder.encode(chunk.output));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
