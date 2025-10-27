import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  badRequestResponse,
} from '@/lib/api-response';
import { validateLanguageData } from '@/lib/validation';

// GET /api/languages - 获取所有语言
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const where = isActive ? { isActive: isActive === 'true' } : undefined;

    const languages = await prisma.language.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      include: {
        _count: {
          select: { translations: true },
        },
      },
    });

    return successResponse(languages);
  } catch (error) {
    console.error('Error fetching languages:', error);
    return errorResponse('Failed to fetch languages');
  }
}

// POST /api/languages - 创建新语言
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateLanguageData(body);

    if (!validation.valid) {
      return badRequestResponse(validation.errors.join(', '));
    }

    // 如果设置为默认语言，先取消其他语言的默认状态
    if (body.isDefault) {
      await prisma.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const language = await prisma.language.create({
      data: {
        code: body.code.trim(),
        name: body.name.trim(),
        isActive: body.isActive ?? true,
        isDefault: body.isDefault ?? false,
      },
    });

    return successResponse(language, 'Language created successfully');
  } catch (error: any) {
    console.error('Error creating language:', error);
    if (error.code === 'P2002') {
      return badRequestResponse('Language code already exists');
    }
    return errorResponse('Failed to create language');
  }
}
