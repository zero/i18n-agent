import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// 常用语言列表
const languages = [
  {
    code: 'en',
    name: 'English',
    isActive: true,
    isDefault: true,
  },
  {
    code: 'zh-CN',
    name: '简体中文',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'zh-TW',
    name: '繁體中文',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'ja',
    name: '日本語',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'ko',
    name: '한국어',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'fr',
    name: 'Français',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'de',
    name: 'Deutsch',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'es',
    name: 'Español',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'pt',
    name: 'Português',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'ru',
    name: 'Русский',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'ar',
    name: 'العربية',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'it',
    name: 'Italiano',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'nl',
    name: 'Nederlands',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'pl',
    name: 'Polski',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'tr',
    name: 'Türkçe',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'vi',
    name: 'Tiếng Việt',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'th',
    name: 'ไทย',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'id',
    name: 'Bahasa Indonesia',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'ms',
    name: 'Bahasa Melayu',
    isActive: true,
    isDefault: false,
  },
  {
    code: 'hi',
    name: 'हिन्दी',
    isActive: true,
    isDefault: false,
  },
];

async function main() {
  console.log('🌱 开始填充语言数据...');

  // 清空现有数据（可选，根据需要启用）
  // await prisma.translation.deleteMany();
  // await prisma.language.deleteMany();
  // console.log('✅ 已清空现有数据');

  // 插入语言数据
  for (const language of languages) {
    const result = await prisma.language.upsert({
      where: { code: language.code },
      update: language,
      create: language,
    });
    console.log(`✅ 创建/更新语言：${result.name} (${result.code})`);
  }

  console.log('🎉 语言数据填充完成！');
  console.log(`📊 共有 ${languages.length} 种语言`);

  // 查询并显示所有语言
  const allLanguages = await prisma.language.findMany({
    orderBy: { code: 'asc' },
  });

  console.log('\n📋 当前支持的语言列表：');
  console.table(
    allLanguages.map((lang) => ({
      代码: lang.code,
      名称: lang.name,
      启用: lang.isActive ? '✅' : '❌',
      默认: lang.isDefault ? '⭐' : '',
    }))
  );
}

main()
  .catch((e) => {
    console.error('❌ 错误：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
