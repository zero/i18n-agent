import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse,
} from '@/lib/api-response';
import { validateTranslationData } from '@/lib/validation';

type Params = {
  params: Promise<{ id: string }>;
};

// GET /api/translations/[id] - 获取单个翻译
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const translation = await prisma.translation.findUnique({
      where: { id },
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

    if (!translation) {
      return notFoundResponse('Translation not found');
    }

    return successResponse(translation);
  } catch (error) {
    console.error('Error fetching translation:', error);
    return errorResponse('Failed to fetch translation');
  }
}

// PUT /api/translations/[id] - 更新翻译
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateTranslationData(body);

    if (!validation.valid) {
      return badRequestResponse(validation.errors.join(', '));
    }

    // 检查翻译是否存在
    const existingTranslation = await prisma.translation.findUnique({
      where: { id },
    });

    if (!existingTranslation) {
      return notFoundResponse('Translation not found');
    }

    // 验证语言是否存在
    const language = await prisma.language.findUnique({
      where: { id: body.languageId },
    });

    if (!language) {
      return badRequestResponse('Language not found');
    }

    const translation = await prisma.translation.update({
      where: { id },
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

    return successResponse(translation, 'Translation updated successfully');
  } catch (error: any) {
    console.error('Error updating translation:', error);
    if (error.code === 'P2002') {
      return badRequestResponse(
        'Translation with this key and language already exists'
      );
    }
    return errorResponse('Failed to update translation');
  }
}

// DELETE /api/translations/[id] - 删除翻译
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // 检查翻译是否存在
    const translation = await prisma.translation.findUnique({
      where: { id },
    });

    if (!translation) {
      return notFoundResponse('Translation not found');
    }

    await prisma.translation.delete({
      where: { id },
    });

    return successResponse({ id }, 'Translation deleted successfully');
  } catch (error) {
    console.error('Error deleting translation:', error);
    return errorResponse('Failed to delete translation');
  }
}
