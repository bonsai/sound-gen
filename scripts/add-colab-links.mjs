/**
 * scripts/add-colab-links.mjs
 * 全記事の文末に Colab POC リンクを追加
 *
 * 使い方:
 *   node scripts/add-colab-links.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = resolve(__dirname, '..', 'articles');
const COLABS_DIR = resolve(__dirname, '..', 'colabs');

function slugifyColab(name) {
  return name
    .replace(/[：:]/g, '_')
    .replace(/[^a-zA-Z0-9_\u3000-\u9FFF\-\. ]/g, '')
    .replace(/\s+/g, '_');
}

function main() {
  const articles = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
  let count = 0;

  for (const article of articles) {
    const base = article.replace('.md', '');
    const colabName = `poc_${slugifyColab(base)}.ipynb`;
    const colabPath = resolve(COLABS_DIR, colabName);

    if (!existsSync(colabPath)) {
      console.log(`⚠️  Colab not found: ${colabName}`);
      continue;
    }

    const md = readFileSync(resolve(ARTICLES_DIR, article), 'utf8');

    // Check if link already exists
    if (md.includes('colab.research.google.com')) {
      console.log(`⏭️  ${article} (already has link)`);
      continue;
    }

    const link = `\n---\n\n🔗 [▶ この記事の内容をColabで動かす](https://colab.research.google.com/github/bonsai/sound-gen/blob/main/colabs/${encodeURIComponent(colabName)})\n`;
    writeFileSync(resolve(ARTICLES_DIR, article), md.trimEnd() + link);
    count++;
    console.log(`✅ ${article} → colab link added`);
  }

  console.log(`\n🎯 Added ${count} Colab links to articles`);
}

import { existsSync } from 'fs';
main();
