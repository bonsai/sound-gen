/**
 * publish-scheduled.mjs
 * manifest.json の scheduled から次の記事を Qiita 下書き投稿
 *
 * 使い方:
 *   node scripts/publish-scheduled.mjs              # 次の1件を下書き投稿
 *   node scripts/publish-scheduled.mjs --publish   # 次の1件を公開
 *   node scripts/publish-scheduled.mjs --all        # 全scheduledを一気に投稿
 *   node scripts/publish-scheduled.mjs --slow       # 1件投稿して停止（429対策）
 *
 * 事前に schedule.mjs add <name> でスケジュール登録が必要
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = resolve(__dirname, '..', 'articles', 'speech-ai', 'manifest.json');
const ARTICLES_DIR = resolve(__dirname, '..', 'articles', 'speech-ai');
const ENV_PATH = resolve(__dirname, '..', '.env.qiita');

function loadEnv() {
  if (!existsSync(ENV_PATH)) throw new Error('.env.qiita not found');
  const content = readFileSync(ENV_PATH, 'utf8');
  for (const line of content.split('\n')) {
    const [k, v] = line.split('=');
    if (k?.trim() === 'QIITA_API_TOKEN') return v.trim();
  }
  throw new Error('QIITA_API_TOKEN not found in .env.qiita');
}

function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(m) {
  m.updated = new Date().toISOString().slice(0, 10);
  writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2) + '\n');
}

function parseMarkdown(md, filename) {
  const lines = md.split('\n');
  let title = '';
  let body = '';
  let tags = [];
  let lineIdx = 0;

  if (lines[0] === '---') {
    lineIdx = 1;
    while (lineIdx < lines.length) {
      if (lines[lineIdx] === '---') { lineIdx++; break; }
      const m = lines[lineIdx].match(/^tags:\s*\[(.+)\]/);
      if (m) tags = m[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
      lineIdx++;
    }
  }

  const content = lines.slice(lineIdx).join('\n').trim();
  const h1 = content.match(/^#\s+(.+)/m);
  if (h1) {
    title = h1[1].trim();
    body = content.replace(/^#\s+.+\n/m, '').trim();
  } else {
    title = filename.replace('.md', '');
    body = content;
  }

  return { title, body, tags };
}

async function postToQiita(token, title, body, tags, isDraft = true) {
  const res = await fetch('https://qiita.com/api/v2/items', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      tags: tags.map(t => ({ name: t })),
      private: isDraft,
      tweet: false
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Qiita API error (${res.status}): ${err.message || res.statusText}`);
  }
  return await res.json();
}

async function publishOne(token, articleName, manifest, isDraft = true) {
  const filePath = resolve(ARTICLES_DIR, `${articleName}.md`);
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${articleName}.md (broken symlink?)`);
    return false;
  }

  const md = readFileSync(filePath, 'utf8');
  const { title, body, tags } = parseMarkdown(md, articleName);

  // manifest tags を優先、記事のタグを補完、最大5つ
  const allTags = [...new Set([...(manifest.tags || []), ...tags])].slice(0, 5);

  console.log(`📝 Posting: "${title}" (${[...body].length} chars)`);
  process.stdout.write('   🚀 Sending...');

  try {
    const article = await postToQiita(token, title, body, allTags, isDraft);
    console.log(' ✅');
    console.log(`   🔗 ${article.url}`);
    console.log(`   🆔 ${article.id}`);

    // Move from scheduled to published
    manifest.scheduled = manifest.scheduled.filter(s => s !== articleName);
    if (!manifest.published.includes(articleName)) {
      manifest.published.push(articleName);
    }
    saveManifest(manifest);
    return true;
  } catch (e) {
    console.log(` ❌`);
    console.error(`   ${e.message}`);
    return false;
  }
}

async function main() {
  const isAll = process.argv.includes('--all');
  const isSlow = process.argv.includes('--slow');
  const isPublish = process.argv.includes('--publish');
  const token = loadEnv();
  const manifest = loadManifest();

  if (manifest.scheduled.length === 0) {
    console.log('📭 No scheduled articles. Use: node scripts/schedule.mjs add <name>');
    return;
  }

  if (isAll) {
    // Publish all sequentially
    for (const article of [...manifest.scheduled]) {
      const ok = await publishOne(token, article, manifest, !isPublish);
      if (!ok) break;
      if (isSlow) {
        console.log('   ⏳ Waiting 3s for rate limit...');
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    console.log(`\n✅ Done. Remaining scheduled: ${manifest.scheduled.length}`);
  } else {
    const next = manifest.scheduled[0];
    await publishOne(token, next, manifest, !isPublish);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
