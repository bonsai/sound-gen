/**
 * qiita_post.mjs
 * Qiita API v2 を使って Markdown ファイルを下書き/公開する
 *
 * 使い方:
 *   node qiita_post.mjs <file.md> [--draft]
 *   node qiita_post.mjs articles/親子対話_キオクシア.md
 *   node qiita_post.mjs articles/parent-child.md --draft
 *
 * 事前準備:
 *   1. Qiita でログイン (https://qiita.com/settings/applications)
 *   2. 「アクセストークンを生成する」から新規トークンを作成
 *   3. scopes: read_qiita, write_qiita を選択
 *   4. 生成されたトークンを .env.qiita に貼り付け:
 *      QIITA_API_TOKEN=xxxxx
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

// ── 環境変数読み込み ──────────────────────────────────────────────
function loadEnv() {
  const dir = import.meta.dirname ?? '.';
  let envPath = resolve(dir, '.env.qiita');
  if (!existsSync(envPath)) {
    envPath = resolve(dir, '..', '.env.qiita');
  }
  if (!existsSync(envPath)) {
    console.error('❌ .env.qiita が見つかりません\n');
    console.error('セットアップ手順:');
    console.error('  1. https://qiita.com/settings/applications にアクセス');
    console.error('  2. 「アクセストークンを生成する」をクリック');
    console.error('  3. scopes: read_qiita, write_qiita を選択');
    console.error('  4. トークンをコピーして .env.qiita に以下の形式で保存:\n');
    console.error('     QIITA_API_TOKEN=xxxxxxxxxxxxxxxx\n');
    process.exit(1);
  }

  const content = readFileSync(envPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  const env = {};

  for (const line of lines) {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  }

  if (!env.QIITA_API_TOKEN) {
    console.error('❌ QIITA_API_TOKEN が設定されていません');
    process.exit(1);
  }
  return env;
}

// ── Markdown → Qiita HTML/Markdown パース ────────────────────────
function parseMarkdown(md) {
  const lines = md.split('\n');
  let title = '';
  let body = '';
  let tags = [];
  let inFrontmatter = false;
  let lineIdx = 0;

  // YAML Front matter を探す
  if (lines[0] === '---') {
    inFrontmatter = true;
    lineIdx = 1;
    while (lineIdx < lines.length) {
      const line = lines[lineIdx];
      if (line === '---') {
        lineIdx++;
        break;
      }
      const match = line.match(/^tags:\s*\[(.+)\]/);
      if (match) {
        tags = match[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
      }
      lineIdx++;
    }
  }

  // 本文抽出
  const content = lines.slice(lineIdx).join('\n').trim();

  // 最初の# を タイトルとする
  const h1Match = content.match(/^#\s+(.+)/m);
  if (h1Match) {
    title = h1Match[1].trim();
    body = content.replace(/^#\s+.+\n/m, '').trim();
  } else {
    body = content;
    title = basename(md, '.md');
  }

  return { title, body, tags };
}

// ── Qiita API ────────────────────────────────────────────────────
const API_BASE = 'https://qiita.com/api/v2';

async function createArticle(token, title, body, tags, isDraft = false) {
  const res = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'note-automation'
    },
    body: JSON.stringify({
      title: title,
      body: body,
      tags: tags.map(tag => ({ name: tag })),
      private: isDraft, // private=true → 限定公開 (下書き的)
      tweet: false
    })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Qiita API エラー (${res.status}): ${error.message || res.statusText}`);
  }

  return await res.json();
}

// ── タイトル抽出 ──────────────────────────────────────────────────
function extractTitle(md, filename) {
  const h1 = md.match(/^#\s+(.+)/m)?.[1];
  if (h1) return h1.trim();
  return basename(filename, '.md');
}

// ── メイン ───────────────────────────────────────────────────────
async function main() {
  const filePath = process.argv[2];
  const isDraft = process.argv.includes('--draft');

  if (!filePath) {
    console.error('使い方: node qiita_post.mjs <file.md> [--draft]');
    console.error('例: node qiita_post.mjs articles/parent-child.md');
    console.error('例: node qiita_post.mjs articles/parent-child.md --draft');
    process.exit(1);
  }

  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    console.error(`❌ ファイルが見つかりません: ${absPath}`);
    process.exit(1);
  }

  const env = loadEnv();
  const md = readFileSync(absPath, 'utf8');
  const { title, body, tags } = parseMarkdown(md);
  const bodyLength = [...body].length;

  console.log(`📝 投稿準備: "${title}"`);
  console.log(`   ファイル: ${basename(filePath)}`);
  console.log(`   文字数: ${bodyLength}`);
  console.log(`   タグ: ${tags.length > 0 ? tags.join(', ') : '(なし)'}`);
  console.log(`   状態: ${isDraft ? '限定公開' : '下書き'}`);

  process.stdout.write('\n🚀 Qiita へ投稿中...');
  try {
    const article = await createArticle(env.QIITA_API_TOKEN, title, body, tags, isDraft);
    console.log(' ✅ 完了');
    console.log(`🔗 ${article.url}`);
    console.log(`   記事ID: ${article.id}`);
  } catch (e) {
    console.log(` ❌ 失敗`);
    console.error(e.message);
    process.exit(1);
  }
}

main();
