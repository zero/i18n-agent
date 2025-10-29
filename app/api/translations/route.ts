import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  badRequestResponse,
} from '@/lib/api-response';
import { validateTranslationData } from '@/lib/validation';

// GET /api/translations - 获取所有翻译
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const languageCode =
      searchParams.get('languageCode') || searchParams.get('languageId'); // 兼容旧参数名
    const key = searchParams.get('key');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: { languageCode?: string; key?: { contains: string } } = {};
    if (languageCode) where.languageCode = languageCode;
    if (key) where.key = { contains: key };

    const [translations, total] = await Promise.all([
      prisma.translation.findMany({
        where,
        include: {
          language: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: [{ key: 'asc' }, { languageCode: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.translation.count({ where }),
    ]);

    return successResponse({
      translations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching translations:', error);
    return errorResponse('Failed to fetch translations');
  }
}

// POST /api/translations - 创建新翻译
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateTranslationData(body);

    if (!validation.valid) {
      return badRequestResponse(validation.errors.join(', '));
    }

    // 兼容旧字段名
    const languageCode = body.languageCode || body.languageId;
    if (!languageCode) {
      return badRequestResponse('languageCode is required');
    }

    // 验证语言是否存在
    const language = await prisma.language.findUnique({
      where: { code: languageCode },
    });

    if (!language) {
      return badRequestResponse('Language not found');
    }

    const translation = await prisma.translation.create({
      data: {
        key: body.key.trim(),
        languageCode: languageCode,
        value: body.value,
      },
      include: {
        language: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    return successResponse(translation, 'Translation created successfully');
  } catch (error) {
    console.error('Error creating translation:', error);
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      return badRequestResponse(
        'Translation with this key and language already exists'
      );
    }
    return errorResponse('Failed to create translation');
  }
}
