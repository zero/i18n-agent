import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse,
} from '@/lib/api-response';
import { validateLanguageData } from '@/lib/validation';

type Params = {
  params: Promise<{ id: string }>;
};

// GET /api/languages/[id] - 获取单个语言
// 注意：[id] 参数现在实际上是语言代码（code）
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    // id 参数实际上是语言代码
    const language = await prisma.language.findUnique({
      where: { code: id },
      include: {
        _count: {
          select: { translations: true },
        },
      },
    });

    if (!language) {
      return notFoundResponse('Language not found');
    }

    return successResponse(language);
  } catch (error) {
    console.error('Error fetching language:', error);
    return errorResponse('Failed to fetch language');
  }
}

// PUT /api/languages/[id] - 更新语言
// 注意：[id] 参数现在实际上是语言代码（code）
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    // id 参数实际上是语言代码
    const body = await request.json();
    const validation = validateLanguageData(body);

    if (!validation.valid) {
      return badRequestResponse(validation.errors.join(', '));
    }

    // 检查语言是否存在
    const existingLanguage = await prisma.language.findUnique({
      where: { code: id },
    });

    if (!existingLanguage) {
      return notFoundResponse('Language not found');
    }

    // 如果设置为默认语言，先取消其他语言的默认状态
    if (body.isDefault && !existingLanguage.isDefault) {
      await prisma.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const language = await prisma.language.update({
      where: { code: id },
      data: {
        // code 不能更新（它是主键）
        name: body.name.trim(),
        isActive: body.isActive,
        isDefault: body.isDefault,
      },
    });

    return successResponse(language, 'Language updated successfully');
  } catch (error) {
    console.error('Error updating language:', error);
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      return badRequestResponse('Language code already exists');
    }
    return errorResponse('Failed to update language');
  }
}

// DELETE /api/languages/[id] - 删除语言
// 注意：[id] 参数现在实际上是语言代码（code）
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    // id 参数实际上是语言代码

    // 检查语言是否存在
    const language = await prisma.language.findUnique({
      where: { code: id },
      include: {
        _count: {
          select: { translations: true },
        },
      },
    });

    if (!language) {
      return notFoundResponse('Language not found');
    }

    // 不允许删除默认语言
    if (language.isDefault) {
      return badRequestResponse('Cannot delete default language');
    }

    await prisma.language.delete({
      where: { code: id },
    });

    return successResponse(
      { code: id },
      `Language deleted successfully (${language._count.translations} translations removed)`
    );
  } catch (error) {
    console.error('Error deleting language:', error);
    return errorResponse('Failed to delete language');
  }
}
