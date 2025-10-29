import { createLLM, AGENT_SYSTEM_PROMPT, AGENT_CONFIG } from './config';
import { allTools } from './tools';
import {
  SystemMessage,
  HumanMessage,
  ToolMessage,
} from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

/**
 * 延迟函数，用于在请求之间添加间隔
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * LLM 请求频率控制器
 * OpenRouter 免费模型限制：20 次/分钟 = 3 秒/次
 */
class RateLimiter {
  private lastCallTime: number = 0;
  private readonly minInterval: number;
  private callCount: number = 0;
  private windowStart: number = Date.now();

  constructor(callsPerMinute: number = 20) {
    // 计算最小间隔（毫秒）
    this.minInterval = Math.ceil(60000 / callsPerMinute);
    console.log(
      `🎛️  [Rate Limiter] 初始化：${callsPerMinute} 次/分钟 (最小间隔 ${this.minInterval}ms)`
    );
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // 重置时间窗口（每分钟）
    if (now - this.windowStart >= 60000) {
      console.log(
        `🔄 [Rate Limiter] 重置计数器 (上一分钟调用了 ${this.callCount} 次)`
      );
      this.callCount = 0;
      this.windowStart = now;
    }

    // 计算需要等待的时间
    const timeSinceLastCall = now - this.lastCallTime;
    const waitTime = Math.max(0, this.minInterval - timeSinceLastCall);

    if (waitTime > 0) {
      console.log(
        `⏱️  [Rate Limiter] 距上次调用 ${timeSinceLastCall}ms，需等待 ${waitTime}ms (总间隔 ${this.minInterval}ms)`
      );
      await delay(waitTime);
    }

    this.lastCallTime = Date.now();
    this.callCount++;
    console.log(`📊 [Rate Limiter] 当前窗口第 ${this.callCount} 次调用`);
  }

  getStats(): { callCount: number; windowRemaining: number } {
    const now = Date.now();
    const windowRemaining = Math.max(0, 60000 - (now - this.windowStart));
    return { callCount: this.callCount, windowRemaining };
  }
}

// 创建全局 rate limiter 实例（20 次/分钟）
const llmRateLimiter = new RateLimiter(20);

/**
 * 指数退避重试函数（带详细日志）
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: string = 'LLM Call',
  useRateLimiter: boolean = true
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // 应用频率限制
      if (useRateLimiter && i === 0) {
        await llmRateLimiter.waitIfNeeded();
      }

      const startTime = Date.now();
      console.log(
        `🚀 [${context}] 开始调用... (attempt ${i + 1}/${maxRetries})`
      );

      const result = await fn();

      const duration = Date.now() - startTime;
      console.log(`✅ [${context}] 调用成功 (耗时 ${duration}ms)`);

      // 显示频率限制统计
      if (useRateLimiter) {
        const stats = llmRateLimiter.getStats();
        console.log(
          `📊 [Rate Limiter] 本分钟已调用 ${stats.callCount} 次，窗口剩余 ${Math.round(stats.windowRemaining / 1000)}秒`
        );
      }

      return result;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const duration = Date.now() - Date.now();

      console.error(
        `❌ [${context}] 调用失败 (attempt ${i + 1}/${maxRetries}):`,
        {
          error: lastError.message,
          duration: `${duration}ms`,
        }
      );

      // 检查是否是 rate limit 错误
      const errorStr = String(error);
      const isRateLimit =
        errorStr.includes('429') || errorStr.includes('rate_limit');

      if (isRateLimit && i < maxRetries - 1) {
        // Rate limit 错误，使用更长的延迟
        const delayMs = baseDelay * Math.pow(2, i);
        console.log(
          `⏳ [${context}] Rate Limit 错误，等待 ${delayMs}ms 后重试...`
        );
        await delay(delayMs);
        // 强制等待 rate limiter 的最小间隔
        if (useRateLimiter) {
          await llmRateLimiter.waitIfNeeded();
        }
      } else if (i < maxRetries - 1) {
        // 其他错误，短暂延迟后重试
        console.log(`⏳ [${context}] 错误，等待 ${baseDelay}ms 后重试...`);
        await delay(baseDelay);
      } else {
        console.error(`💥 [${context}] 已达到最大重试次数，调用失败`);
      }
    }
  }

  throw lastError || new Error('Max retries reached');
}

/**
 * 格式化工具结果为用户友好的文本
 * 当 LLM 无法生成响应时使用
 */
function formatToolResults(toolMessages: ToolMessage[]): string {
  const results: string[] = [];

  for (const msg of toolMessages) {
    try {
      const content =
        typeof msg.content === 'string'
          ? msg.content
          : JSON.stringify(msg.content);
      const data = JSON.parse(content);

      // 根据不同的工具格式化输出
      if (msg.name === 'get_languages' && data.success) {
        const languages = data.languages || [];
        results.push('📋 **系统支持的语言列表**\n');
        results.push(`共有 ${languages.length} 种语言：\n`);
        languages.forEach(
          (
            lang: {
              isDefault?: boolean;
              isActive?: boolean;
              name: string;
              code: string;
            },
            index: number
          ) => {
            const badge = lang.isDefault ? ' ✓ 默认' : '';
            const status = lang.isActive ? '✅' : '⏸️';
            results.push(
              `${index + 1}. ${status} **${lang.name}** (${lang.code})${badge}`
            );
          }
        );
      } else if (msg.name === 'get_translations' && data.success) {
        const translations = data.translations || [];
        if (translations.length === 0) {
          results.push(`❌ 未找到相关翻译`);
        } else {
          results.push(`🌍 **翻译内容**\n`);
          translations.forEach(
            (t: { language: string; code: string; value: string }) => {
              results.push(`- **${t.language}** (${t.code}): ${t.value}`);
            }
          );
        }
      } else if (msg.name === 'get_default_language' && data.success) {
        const lang = data.language;
        results.push(`🌟 **默认语言**: ${lang.name} (${lang.code})`);
      } else if (msg.name === 'check_translation_exists') {
        const key = data.key || 'undefined';
        if (data.exists) {
          results.push(`✅ 翻译 key "${key}" 已存在`);
        } else {
          results.push(`✓ 翻译 key "${key}" 可以使用（不存在冲突）`);
        }
      } else if (msg.name === 'create_translations_batch' && data.success) {
        const count = data.count || 0;
        results.push(`✅ 成功创建 ${count} 条翻译记录！`);
      } else if (data.success === false) {
        results.push(`❌ 错误：${data.error || '操作失败'}`);
      } else {
        // 其他工具结果，直接展示
        results.push(JSON.stringify(data, null, 2));
      }
    } catch {
      // 无法解析 JSON，直接展示原始内容
      try {
        const content =
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content);
        results.push(content);
      } catch {
        results.push(String(msg.content));
      }
    }
  }

  return results.join('\n');
}

/**
 * 管理上下文窗口，限制历史消息数量
 * 只保留最近的 N 条消息，避免上下文过长导致性能下降
 */
function manageContextWindow(history: BaseMessage[]): BaseMessage[] {
  const maxMessages = AGENT_CONFIG.maxHistoryMessages;

  if (history.length <= maxMessages) {
    return history;
  }

  // 保留最近的 N 条消息
  return history.slice(-maxMessages);
}

// 创建 Agent Executor（使用 Tool Calling 模式）
export async function createAgentExecutor() {
  const llm = createLLM();

  // 绑定工具到 LLM
  const llmWithTools = llm.bindTools(allTools);

  return {
    async stream(input: { input: string; chat_history: BaseMessage[] }) {
      // 应用上下文窗口管理
      const managedHistory = manageContextWindow(input.chat_history);

      // 构建消息
      const messages: BaseMessage[] = [
        new SystemMessage(AGENT_SYSTEM_PROMPT),
        ...managedHistory,
        new HumanMessage(input.input),
      ];

      // 第一次调用 LLM（带重试）
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📨 [LLM Call #1] 准备第一次调用`);
      console.log(`  - 消息数量: ${messages.length}`);
      console.log(`  - 系统消息: 1`);
      console.log(`  - 历史消息: ${managedHistory.length}`);
      console.log(
        `  - 当前输入: "${input.input.substring(0, 50)}${input.input.length > 50 ? '...' : ''}"`
      );
      console.log(`  - 可用工具: ${allTools.map((t) => t.name).join(', ')}`);
      console.log(`${'='.repeat(80)}\n`);

      let response = await retryWithBackoff(
        () => llmWithTools.invoke(messages),
        3,
        2000, // 免费模型使用更长的初始延迟
        'LLM Call #1',
        true // 启用频率限制
      );

      console.log(`\n📦 [LLM Response #1] 收到响应:`);
      console.log(
        `  - 内容长度: ${typeof response.content === 'string' ? response.content.length : 0} 字符`
      );
      console.log(`  - 工具调用数: ${response.tool_calls?.length || 0}`);
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(
          `  - 工具列表: ${response.tool_calls.map((tc) => tc.name).join(', ')}`
        );
      }
      console.log('');

      let iterations = 0;
      const maxIterations = AGENT_CONFIG.maxIterations;

      // 返回异步迭代器
      return {
        async *[Symbol.asyncIterator]() {
          // 循环处理工具调用
          while (iterations < maxIterations) {
            iterations++;

            console.log(`[Agent Iteration ${iterations}]`, {
              hasContent: !!response.content,
              contentType: typeof response.content,
              contentLength:
                typeof response.content === 'string'
                  ? response.content.length
                  : 0,
              hasToolCalls: !!(
                response.tool_calls && response.tool_calls.length > 0
              ),
              toolCallsCount: response.tool_calls?.length || 0,
            });

            // 检查是否有工具调用
            const hasToolCalls =
              response.tool_calls && response.tool_calls.length > 0;

            // 如果没有工具调用，说明是最终响应，输出内容后结束
            if (!hasToolCalls) {
              if (
                response.content &&
                (typeof response.content === 'string'
                  ? response.content.trim()
                  : true)
              ) {
                const content =
                  typeof response.content === 'string'
                    ? response.content
                    : JSON.stringify(response.content);
                console.log('[Agent Final Output]:', content.substring(0, 100));
                yield { output: content };
              } else {
                // 模型没有生成内容，检查是否有之前的工具调用结果
                console.log(
                  '[Agent Warning]: Empty final response, checking for tool results...'
                );

                // 查找最近的工具消息
                const recentToolMessages = messages
                  .filter((m): m is ToolMessage => m._getType() === 'tool')
                  .slice(-5); // 获取最近的 5 个工具结果

                if (recentToolMessages.length > 0) {
                  console.log(
                    '[Agent Fallback]: Formatting tool results directly'
                  );
                  // 直接格式化工具结果返回
                  const formattedOutput = formatToolResults(recentToolMessages);
                  yield { output: formattedOutput };
                } else {
                  // 真的没有任何内容，尝试强制重新生成
                  console.log(
                    '[Agent Warning]: No tool results found, forcing regeneration...'
                  );
                  messages.push(response as BaseMessage);
                  messages.push(
                    new HumanMessage(
                      '请基于上面的信息，用清晰友好的中文回复用户。'
                    )
                  );

                  console.log(`\n${'='.repeat(80)}`);
                  console.log(`📨 [LLM Forced Regeneration] 强制重新生成响应`);
                  console.log(`  - 原因: 空响应，需要强制生成`);
                  console.log(`  - 总消息数: ${messages.length}`);
                  console.log(`${'='.repeat(80)}\n`);

                  // 不需要额外延迟，rate limiter 会自动处理
                  response = await retryWithBackoff(
                    () => llmWithTools.invoke(messages),
                    3,
                    2000,
                    'LLM Forced Regeneration',
                    true // 启用频率限制
                  );

                  console.log(`\n📦 [Forced Response] 收到响应:`);
                  console.log(
                    `  - 内容长度: ${typeof response.content === 'string' ? response.content.length : 0} 字符`
                  );
                  console.log('');

                  if (response.content) {
                    const content =
                      typeof response.content === 'string'
                        ? response.content
                        : JSON.stringify(response.content);
                    console.log(
                      '[Agent Forced Output]:',
                      content.substring(0, 100)
                    );
                    yield { output: content };
                  } else {
                    console.error(
                      '[Agent Error]: Still no content after all attempts'
                    );
                    yield {
                      output: '抱歉，我无法生成响应。请重试或联系管理员。',
                    };
                  }
                }
              }
              break;
            }

            // 有工具调用，先输出当前的文本内容（如果有）
            // 过滤掉 <think> 等内部思考标签
            if (response.content && typeof response.content === 'string') {
              const cleanContent = response.content.trim();
              // 跳过仅包含 <think> 标签或为空的内容
              if (
                cleanContent &&
                !cleanContent.startsWith('<think>') &&
                !cleanContent.startsWith('</think>')
              ) {
                console.log(
                  '[Agent Intermediate Output]:',
                  cleanContent.substring(0, 100)
                );
                yield { output: cleanContent };
              }
            }

            // 执行所有工具调用（添加间隔以避免 rate limit）
            console.log(`\n${'─'.repeat(80)}`);
            console.log(
              `🔧 [Tool Execution] 开始执行工具调用 (共 ${response.tool_calls!.length} 个)`
            );
            console.log(`${'─'.repeat(80)}\n`);

            const toolMessages: BaseMessage[] = [];
            for (let i = 0; i < response.tool_calls!.length; i++) {
              const toolCall = response.tool_calls![i];

              // 在工具调用之间添加延迟（免费模型需要）
              if (i > 0) {
                await delay(500); // 每个工具调用间隔 500ms
                console.log(`⏱️  等待 500ms 后执行下一个工具...\n`);
              }

              console.log(
                `🔨 [Tool #${i + 1}/${response.tool_calls!.length}] ${toolCall.name}`
              );
              console.log(
                `   参数:`,
                JSON.stringify(toolCall.args, null, 2)
                  .split('\n')
                  .map((line, idx) => (idx === 0 ? line : `         ${line}`))
                  .join('\n')
              );
              const tool = allTools.find((t) => t.name === toolCall.name);
              if (tool) {
                try {
                  const startTime = Date.now();
                  // 调用工具的 func 方法
                  const result = await tool.func(toolCall.args as never);
                  const duration = Date.now() - startTime;

                  const resultPreview =
                    result.length > 150
                      ? result.substring(0, 150) + '...'
                      : result;
                  console.log(`   ✅ 成功 (耗时 ${duration}ms)`);
                  console.log(
                    `   结果: ${resultPreview
                      .split('\n')
                      .map((line, idx) =>
                        idx === 0 ? line : `         ${line}`
                      )
                      .join('\n')}\n`
                  );

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
                  console.error(`   ❌ 失败: ${errorMsg}\n`);
                  toolMessages.push(
                    new ToolMessage({
                      content: `Error: ${errorMsg}`,
                      tool_call_id: toolCall.id || toolCall.name,
                      name: toolCall.name,
                    })
                  );
                }
              } else {
                console.error(`   ❌ 工具未找到: ${toolCall.name}\n`);
                toolMessages.push(
                  new ToolMessage({
                    content: `Error: Tool ${toolCall.name} not found`,
                    tool_call_id: toolCall.id || toolCall.name,
                    name: toolCall.name,
                  })
                );
              }
            }

            // 如果没有工具消息，结束
            if (toolMessages.length === 0) {
              console.log('[Agent Warning]: No tool messages generated');
              break;
            }

            // 将工具结果添加到消息历史并继续
            messages.push(response as BaseMessage);
            messages.push(...toolMessages);

            // 再次调用 LLM，让它根据工具结果生成响应（带重试和延迟）
            const callNumber = iterations + 1;
            console.log(`\n${'='.repeat(80)}`);
            console.log(`📨 [LLM Call #${callNumber}] 基于工具结果调用 LLM`);
            console.log(`  - 总消息数: ${messages.length}`);
            console.log(`  - 工具结果数: ${toolMessages.length}`);
            console.log(
              `  - 工具名称: ${toolMessages.map((tm) => tm.name).join(', ')}`
            );
            console.log(`${'='.repeat(80)}\n`);

            // 不需要额外延迟，rate limiter 会自动处理
            response = await retryWithBackoff(
              () => llmWithTools.invoke(messages),
              3,
              2000,
              `LLM Call #${callNumber}`,
              true // 启用频率限制
            );

            console.log(`\n📦 [LLM Response #${callNumber}] 收到响应:`);
            console.log(
              `  - 内容长度: ${typeof response.content === 'string' ? response.content.length : 0} 字符`
            );
            console.log(`  - 工具调用数: ${response.tool_calls?.length || 0}`);
            if (response.tool_calls && response.tool_calls.length > 0) {
              console.log(
                `  - 工具列表: ${response.tool_calls.map((tc) => tc.name).join(', ')}`
              );
            }
            if (response.content && typeof response.content === 'string') {
              const preview = response.content
                .substring(0, 150)
                .replace(/\n/g, ' ');
              const ellipsis = response.content.length > 150 ? '...' : '';
              console.log(`  - 内容预览: "${preview}${ellipsis}"`);
            }
            console.log('');
          }

          // 如果达到最大迭代次数，输出警告
          if (iterations >= maxIterations) {
            console.log('[Agent Warning]: Max iterations reached');
            yield {
              output: '\n\n⚠️ 已达到最大迭代次数，请简化您的请求或分步操作。',
            };
          }
        },
      };
    },
  };
}
