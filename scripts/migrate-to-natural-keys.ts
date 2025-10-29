import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  警告：此脚本将删除所有现有数据！');
  console.log('开始迁移到自然键...\n');

  try {
    // 1. 删除旧表
    console.log('1️⃣  删除旧表...');
    await prisma.$executeRawUnsafe(
      'DROP TABLE IF EXISTS "i18n-agent"."translations" CASCADE'
    );
    await prisma.$executeRawUnsafe(
      'DROP TABLE IF EXISTS "i18n-agent"."languages" CASCADE'
    );
    console.log('✅ 旧表已删除\n');

    // 2. 创建新的 Language 表
    console.log('2️⃣  创建新的 Language 表...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "i18n-agent"."languages" (
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "languages_pkey" PRIMARY KEY ("code")
      )
    `);
    console.log('✅ Language 表已创建\n');

    // 3. 创建新的 Translation 表
    console.log('3️⃣  创建新的 Translation 表...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "i18n-agent"."translations" (
        "key" TEXT NOT NULL,
        "languageCode" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "translations_pkey" PRIMARY KEY ("key","languageCode")
      )
    `);
    console.log('✅ Translation 表已创建\n');

    // 4. 创建索引
    console.log('4️⃣  创建索引...');
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "languages_code_key" ON "i18n-agent"."languages"("code")'
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "languages_code_idx" ON "i18n-agent"."languages"("code")'
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "languages_isActive_idx" ON "i18n-agent"."languages"("isActive")'
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "translations_languageCode_idx" ON "i18n-agent"."translations"("languageCode")'
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "translations_key_idx" ON "i18n-agent"."translations"("key")'
    );
    console.log('✅ 索引已创建\n');

    // 5. 添加外键约束
    console.log('5️⃣  添加外键约束...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "i18n-agent"."translations" 
      ADD CONSTRAINT "translations_languageCode_fkey" 
      FOREIGN KEY ("languageCode") 
      REFERENCES "i18n-agent"."languages"("code") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log('✅ 外键约束已添加\n');

    console.log('🎉 迁移完成！');
    console.log('💡 提示：运行 pnpm db:seed 来填充初始数据');
  } catch (error) {
    console.error('❌ 迁移失败：', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
