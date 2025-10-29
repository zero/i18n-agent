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

// 解析复合 ID (格式：key::languageCode)
function parseCompositeId(
  id: string
): { key: string; languageCode: string } | null {
  const parts = id.split('::');
  if (parts.length !== 2) {
    return null;
  }
  return { key: decodeURIComponent(parts[0]), languageCode: parts[1] };
}

// GET /api/translations/[id] - 获取单个翻译
// 注意：id 格式为 key::languageCode (例如：common.welcome::en)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const parsed = parseCompositeId(id);

    if (!parsed) {
      return badRequestResponse(
        'Invalid translation ID format. Expected: key::languageCode'
      );
    }

    const translation = await prisma.translation.findUnique({
      where: {
        languageCode_key: {
          languageCode: parsed.languageCode,
          key: parsed.key,
        },
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
// 注意：id 格式为 key::languageCode，且 key 和 languageCode 不可更改（它们是主键）
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const parsed = parseCompositeId(id);

    if (!parsed) {
      return badRequestResponse(
        'Invalid translation ID format. Expected: key::languageCode'
      );
    }

    const body = await request.json();
    const validation = validateTranslationData(body);

    if (!validation.valid) {
      return badRequestResponse(validation.errors.join(', '));
    }

    // 检查翻译是否存在
    const existingTranslation = await prisma.translation.findUnique({
      where: {
        languageCode_key: {
          languageCode: parsed.languageCode,
          key: parsed.key,
        },
      },
    });

    if (!existingTranslation) {
      return notFoundResponse('Translation not found');
    }

    // 只允许更新 value 字段（key 和 languageCode 是主键，不可更改）
    const translation = await prisma.translation.update({
      where: {
        languageCode_key: {
          languageCode: parsed.languageCode,
          key: parsed.key,
        },
      },
      data: {
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

    return successResponse(translation, 'Translation updated successfully');
  } catch (error) {
    console.error('Error updating translation:', error);
    return errorResponse('Failed to update translation');
  }
}

// DELETE /api/translations/[id] - 删除翻译
// 注意：id 格式为 key::languageCode
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const parsed = parseCompositeId(id);

    if (!parsed) {
      return badRequestResponse(
        'Invalid translation ID format. Expected: key::languageCode'
      );
    }

    // 检查翻译是否存在
    const translation = await prisma.translation.findUnique({
      where: {
        languageCode_key: {
          languageCode: parsed.languageCode,
          key: parsed.key,
        },
      },
    });

    if (!translation) {
      return notFoundResponse('Translation not found');
    }

    await prisma.translation.delete({
      where: {
        languageCode_key: {
          languageCode: parsed.languageCode,
          key: parsed.key,
        },
      },
    });

    return successResponse(
      { key: parsed.key, languageCode: parsed.languageCode },
      'Translation deleted successfully'
    );
  } catch (error) {
    console.error('Error deleting translation:', error);
    return errorResponse('Failed to delete translation');
  }
}
