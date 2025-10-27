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
    const languageId = searchParams.get('languageId');
    const key = searchParams.get('key');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (languageId) where.languageId = languageId;
    if (key) where.key = { contains: key };

    const [translations, total] = await Promise.all([
      prisma.translation.findMany({
        where,
        include: {
          language: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: [{ key: 'asc' }, { languageId: 'asc' }],
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

    // 验证语言是否存在
    const language = await prisma.language.findUnique({
      where: { id: body.languageId },
    });

    if (!language) {
      return badRequestResponse('Language not found');
    }

    const translation = await prisma.translation.create({
      data: {
        key: body.key.trim(),
        languageId: body.languageId,
        value: body.value,
      },
      include: {
        language: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return successResponse(translation, 'Translation created successfully');
  } catch (error: any) {
    console.error('Error creating translation:', error);
    if (error.code === 'P2002') {
      return badRequestResponse(
        'Translation with this key and language already exists'
      );
    }
    return errorResponse('Failed to create translation');
  }
}
