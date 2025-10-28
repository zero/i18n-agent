import { createLLM, AGENT_SYSTEM_PROMPT } from './config';
import { allTools } from './tools';
import {
  SystemMessage,
  HumanMessage,
  ToolMessage,
} from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

// 创建 Agent Executor（使用 Tool Calling 模式）
export async function createAgentExecutor() {
  const llm = createLLM();

  // 绑定工具到 LLM
  const llmWithTools = llm.bindTools(allTools);

  return {
    async stream(input: { input: string; chat_history: BaseMessage[] }) {
      // 构建消息
      const messages: BaseMessage[] = [
        new SystemMessage(AGENT_SYSTEM_PROMPT),
        ...input.chat_history,
        new HumanMessage(input.input),
      ];

      // 第一次调用 LLM
      let response = await llmWithTools.invoke(messages);
      let iterations = 0;
      const maxIterations = 5;

      // 返回异步迭代器
      return {
        async *[Symbol.asyncIterator]() {
          // 循环处理工具调用
          while (iterations < maxIterations) {
            iterations++;

            // 输出 AI 的回复内容
            if (response.content && typeof response.content === 'string') {
              yield { output: response.content };
            }

            // 检查是否有工具调用
            if (!response.tool_calls || response.tool_calls.length === 0) {
              // 没有工具调用，结束
              break;
            }

            // 执行所有工具调用
            const toolMessages: BaseMessage[] = [];
            for (const toolCall of response.tool_calls) {
              const tool = allTools.find((t) => t.name === toolCall.name);
              if (tool) {
                try {
                  // 调用工具的 func 方法
                  const result = await tool.func(toolCall.args as never);
                  toolMessages.push(
                    new ToolMessage({
                      content: result,
                      tool_call_id: toolCall.id || toolCall.name,
                      name: toolCall.name,
                    })
                  );
                } catch (err) {
                  const errorMsg =
                    err instanceof Error ? err.message : String(err);
                  toolMessages.push(
                    new ToolMessage({
                      content: `Error: ${errorMsg}`,
                      tool_call_id: toolCall.id || toolCall.name,
                      name: toolCall.name,
                    })
                  );
                }
              }
            }

            // 如果没有工具消息，结束
            if (toolMessages.length === 0) {
              break;
            }

            // 将工具结果添加到消息历史并继续
            messages.push(response as BaseMessage);
            messages.push(...toolMessages);

            // 再次调用 LLM
            response = await llmWithTools.invoke(messages);
          }

          // 如果达到最大迭代次数，输出警告
          if (iterations >= maxIterations) {
            yield { output: '\n\n(已达到最大迭代次数)' };
          }
        },
      };
    },
  };
}
