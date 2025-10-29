import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// 工具 1: 获取所有可用语言
export const getLanguagesTool = new DynamicStructuredTool({
  name: 'get_languages',
  description:
    '获取系统中所有可用的语言列表，包括语言代码、名称、是否启用等信息',
  schema: z.object({
    activeOnly: z
      .boolean()
      .optional()
      .describe('是否只获取已启用的语言，默认为 true'),
  }),
  func: async ({ activeOnly = true }) => {
    try {
      const languages = await prisma.language.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      });
      return JSON.stringify({
        success: true,
        languages: languages.map((lang) => ({
          code: lang.code,
          name: lang.name,
          isDefault: lang.isDefault,
          isActive: lang.isActive,
        })),
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: String(error) });
    }
  },
});

// 工具 2: 获取默认语言
export const getDefaultLanguageTool = new DynamicStructuredTool({
  name: 'get_default_language',
  description: '获取系统的默认语言信息',
  schema: z.object({}),
  func: async () => {
    try {
      const defaultLanguage = await prisma.language.findFirst({
        where: { isDefault: true },
      });
      if (!defaultLanguage) {
        return JSON.stringify({
          success: false,
          error: 'No default language found',
        });
      }
      return JSON.stringify({
        success: true,
        language: {
          code: defaultLanguage.code,
          name: defaultLanguage.name,
        },
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: String(error) });
    }
  },
});

// 工具 3: 检查翻译是否存在
export const checkTranslationExistsTool = new DynamicStructuredTool({
  name: 'check_translation_exists',
  description: '检查指定的翻译 key 是否已经存在',
  schema: z.object({
    key: z.string().describe('翻译的 key，例如 common.agree'),
  }),
  func: async ({ key }) => {
    try {
      const count = await prisma.translation.count({
        where: { key },
      });
      return JSON.stringify({
        success: true,
        exists: count > 0,
        count,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: String(error) });
    }
  },
});

// 工具 4: 创建翻译
export const createTranslationTool = new DynamicStructuredTool({
  name: 'create_translation',
  description: '创建一条新的翻译记录。需要提供翻译 key、语言 ID 和翻译后的文本',
  schema: z.object({
    key: z.string().describe('翻译的 key，例如 common.agree'),
    languageId: z.string().describe('语言的 ID'),
    value: z.string().describe('翻译后的文本内容'),
  }),
  func: async ({ key, languageId, value }) => {
    try {
      // languageId 现在应该是 languageCode，但为了兼容，我们尝试找到对应的语言代码
      const language = await prisma.language.findFirst({
        where: { code: languageId },
      });

      if (!language) {
        return JSON.stringify({
          success: false,
          error: `Language with code "${languageId}" not found`,
        });
      }

      const translation = await prisma.translation.create({
        data: { key, languageCode: languageId, value },
        include: {
          language: {
            select: { code: true, name: true },
          },
        },
      });
      return JSON.stringify({
        success: true,
        translation: {
          key: translation.key,
          value: translation.value,
          languageCode: translation.languageCode,
        },
      });
    } catch (error) {
      const prismaError = error as { code?: string; message?: string };
      if (prismaError.code === 'P2002') {
        return JSON.stringify({
          success: false,
          error: 'Translation with this key and language already exists',
        });
      }
      return JSON.stringify({ success: false, error: String(error) });
    }
  },
});

// 工具 5: 批量创建翻译
export const createTranslationsBatchTool = new DynamicStructuredTool({
  name: 'create_translations_batch',
  description:
    '批量创建多个语言的翻译记录。用于同时为一个 key 创建多种语言的翻译',
  schema: z.object({
    key: z.string().describe('翻译的 key，例如 common.agree'),
    translations: z
      .array(
        z.object({
          languageCode: z.string().describe('语言代码，例如 en, zh-CN, ja'),
          value: z.string().describe('翻译后的文本内容'),
        })
      )
      .describe('翻译列表，每个包含语言代码和翻译文本'),
  }),
  func: async ({ key, translations }) => {
    try {
      const results = [];
      const errors = [];

      for (const { languageCode, value } of translations) {
        try {
          const translation = await prisma.translation.create({
            data: { key, languageCode, value },
            include: {
              language: {
                select: { code: true, name: true },
              },
            },
          });
          results.push({
            success: true,
            language: translation.language.name,
            value: translation.value,
          });
        } catch (error) {
          const prismaError = error as { code?: string; message?: string };
          errors.push({
            languageCode,
            error:
              prismaError.code === 'P2002'
                ? 'Already exists'
                : String(prismaError.message || error),
          });
        }
      }

      return JSON.stringify({
        success: errors.length === 0,
        created: results.length,
        count: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: String(error) });
    }
  },
});

// 注意：我们不需要单独的 translate_text 工具
// LLM 本身就具备翻译能力，直接在生成翻译内容时使用即可

// 工具 7: 获取现有翻译
export const getTranslationsTool = new DynamicStructuredTool({
  name: 'get_translations',
  description: '根据 key 获取已有的翻译记录',
  schema: z.object({
    key: z.string().describe('翻译的 key，例如 common.agree'),
  }),
  func: async ({ key }) => {
    try {
      const translations = await prisma.translation.findMany({
        where: { key },
        include: {
          language: {
            select: { code: true, name: true },
          },
        },
      });
      return JSON.stringify({
        success: true,
        count: translations.length,
        translations: translations.map((t) => ({
          language: t.language.name,
          code: t.language.code,
          value: t.value,
        })),
      });
    } catch (error) {
      return JSON.stringify({ success: false, error: String(error) });
    }
  },
});

// 导出所有工具
export const allTools = [
  getLanguagesTool,
  getDefaultLanguageTool,
  checkTranslationExistsTool,
  getTranslationsTool,
  createTranslationsBatchTool,
  // 注意：createTranslationTool 通常不需要，因为我们使用批量创建
  // 但保留它以备单独创建翻译的场景
  createTranslationTool,
];
