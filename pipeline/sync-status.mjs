import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(PROJECT_ROOT, '.env.qiita');
const TARGET_DIR_DEFAULT = 'articles/qiita-post';
const STATE_PATH = resolve(PROJECT_ROOT, 'sync-state.json');

function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    console.error('.env.qiita が見つかりません');
    process.exit(1);
  }
  const content = readFileSync(ENV_PATH, 'utf8');
  for (const line of content.split('\n').filter(l => l.trim() && !l.startsWith('#'))) {
    const [key, value] = line.split('=');
    if (key?.trim() === 'QIITA_API_TOKEN') return value.trim();
  }
  console.error('QIITA_API_TOKEN が設定されていません');
  process.exit(1);
}

function extractFrontMatter(md) {
  const fm = md.match(/^---\n([\s\S]*?)---\n/);
  if (!fm) return {};
  const fields = {};
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)/);
    if (m) fields[m[1]] = m[2].replace(/^"(.*)"$/, '$1').trim();
  }
  return fields;
}

function extractTitle(md, filename) {
  const fm = extractFrontMatter(md);
  if (fm.title) return fm.title;
  const h1 = md.match(/^#\s+(.+)/m);
  return h1 ? h1[1].trim() : filename.replace(/\.md$/, '');
}

async function fetchAllItems(token) {
  const items = [];
  let page = 1;
  while (page <= 100) {
    const res = await fetch(`https://qiita.com/api/v2/authenticated_user/items?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Qiita API エラー (${res.status})`);
    const data = await res.json();
    items.push(...data);
    const link = res.headers.get('Link');
    if (!link || !link.includes('rel="next"')) break;
    page++;
  }
  return items;
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { articles: {}, series: {} };
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); }
  catch { return { articles: {}, series: {} }; }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

async function main() {
  const saveMode = process.argv.includes('--save');
  const token = loadEnv();

  const targetArg = process.argv.find(a => a.startsWith('--dir='));
  const relDir = targetArg ? targetArg.slice(6) : TARGET_DIR_DEFAULT;
  const TARGET_DIR = resolve(PROJECT_ROOT, relDir);

  if (!existsSync(TARGET_DIR)) {
    console.error(`ディレクトリが見つかりません: ${TARGET_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(TARGET_DIR).filter(f => f.endsWith('.md')).sort();
  const localArticles = [];
  for (const f of files) {
    const md = readFileSync(join(TARGET_DIR, f), 'utf8');
    const fm = extractFrontMatter(md);
    localArticles.push({
      file: f,
      title: extractTitle(md, f),
      customId: fm.id || null
    });
  }

  const state = loadState();

  process.stdout.write('Qiita から記事一覧を取得中...');
  const qiitaItems = await fetchAllItems(token);
  const qiitaMap = {};
  for (const item of qiitaItems) {
    qiitaMap[item.title] = { id: item.id, url: item.url, private: item.private };
  }
  console.log(' done');

  console.log('\n=== ローカル vs Qiita シンク状態 ===\n');
  console.log(`${'状態'.padEnd(4)} | ${'ID'.padEnd(16)} | ${'Qiita'.padEnd(7)} | タイトル`);
  console.log('-'.repeat(80));

  const withId = localArticles.filter(a => a.customId);
  const withoutId = localArticles.filter(a => !a.customId);

  if (withId.length) {
    console.log(`\n-- ID管理あり --`);
    for (const local of withId) {
      const qiita = qiitaMap[local.title] || null;
      const icon = qiita ? (qiita.private ? '📝' : '✅') : '📄';
      const qiitaStatus = qiita ? (qiita.private ? 'draft' : 'public') : '-----';
      const stateEntry = state.articles[local.customId];
      const idDisplay = stateEntry
        ? `${local.customId} → ${stateEntry.id}`
        : local.customId;
      const url = qiita ? qiita.url : (stateEntry?.url || '');
      console.log(`${icon.padEnd(4)} | ${idDisplay.padEnd(16)} | ${qiitaStatus.padEnd(7)} | ${local.title}`);
      if (saveMode && qiita) {
        state.articles[local.customId] = {
          qiitaId: qiita.id,
          title: local.title,
          url: qiita.url,
          private: qiita.private
        };
      }
    }
  }

  if (withoutId.length) {
    console.log(`\n-- IDなし --`);
    for (const local of withoutId) {
      const qiita = qiitaMap[local.title] || null;
      const icon = qiita ? (qiita.private ? '📝' : '✅') : '📄';
      const qiitaStatus = qiita ? (qiita.private ? 'draft' : 'public') : '-----';
      console.log(`${icon.padEnd(4)} | ${'(なし)'.padEnd(16)} | ${qiitaStatus.padEnd(7)} | ${local.title}`);
    }
  }

  const qiitaOnly = qiitaItems.filter(item => !localArticles.some(l => l.title === item.title));
  if (qiitaOnly.length) {
    console.log(`\n-- Qiitaのみ（ローカルなし） --`);
    for (const item of qiitaOnly) {
      const icon = item.private ? '📝' : '☁️';
      const qiitaStatus = item.private ? 'draft' : 'public';
      console.log(`${icon.padEnd(4)} | ${'(なし)'.padEnd(16)} | ${qiitaStatus.padEnd(7)} | ${item.title}`);
    }
  }

  if (saveMode) {
    saveState(state);
    console.log(`\n状態を保存しました: ${STATE_PATH}`);
  }

  console.log('\n--- 凡例 ---');
  console.log('✅ 公開済み  📝 下書き中  📄 未投稿  ☁️ Qiitaのみ');
  console.log();
  console.log(`ローカルファイル: ${files.length}（ID有: ${withId.length}, ID無: ${withoutId.length}）`);
  console.log(`Qiita記事:       ${qiitaItems.length}`);
  console.log(`対象ディレクトリ: ${TARGET_DIR}`);
  console.log(`状態ファイル:     ${existsSync(STATE_PATH) ? STATE_PATH : '(なし)'}`);
  console.log();
  console.log(`ヒント: --save で状態保存, --dir=path で対象変更 (default: ${TARGET_DIR_DEFAULT})`);
}

main().catch(e => { console.error(e); process.exit(1); });
