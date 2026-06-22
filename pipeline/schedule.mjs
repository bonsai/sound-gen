/**
 * schedule.mjs
 * 記事のスケジュール管理 — scheduled タグの追加・削除・一覧
 *
 * 使い方:
 *   node scripts/schedule.mjs list                          # 全記事一覧 (scheduled/published/unscheduled)
 *   node scripts/schedule.mjs add "親子対話：Attention"     # 記事をscheduledに追加
 *   node scripts/schedule.mjs remove "親子対話：Attention"  # 記事をscheduledから削除
 *   node scripts/schedule.mjs next                          # 次の投稿予定を表示
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = resolve(__dirname, '..', 'articles', 'manifest.json');
const ARTICLES_DIR = resolve(__dirname, '..', 'articles');

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { scheduled: [], published: [], tags: [] };
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(m) {
  m.updated = new Date().toISOString().slice(0, 10);
  writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2) + '\n');
}

function listArticles() {
  const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
  const manifest = loadManifest();
  const scheduled = new Set(manifest.scheduled);
  const published = new Set(manifest.published);

  console.log(`📚 speech-ai シリーズ (${files.length} articles)\n`);
  console.log('STATUS  ARTICLE');
  console.log('------  -------');
  for (const f of files) {
    const name = f.replace('.md', '');
    if (published.has(name)) console.log(`  ✅  ${name}`);
    else if (scheduled.has(name)) console.log(`  📅  ${name}`);
    else console.log(`  ⬜  ${name}`);
  }
  console.log(`\n📅 scheduled: ${manifest.scheduled.length}`);
  console.log(`✅ published: ${manifest.published.length}`);
  console.log(`⬜ remaining: ${files.length - manifest.scheduled.length - manifest.published.length}`);
}

function addScheduled(name) {
  const m = loadManifest();
  // Find matching file
  let files = readdirSync(ARTICLES_DIR).filter(f => f.includes(name) && f.endsWith('.md'));
  if (files.length === 0) { console.error(`❌ No article matching "${name}"`); return; }
  if (files.length > 1) {
    const exact = files.find(f => f.replace('.md', '') === name);
    if (exact) { files = [exact]; }
    else { console.error(`❌ Multiple matches: ${files.join(', ')}`); return; }
  }
  const article = files[0].replace('.md', '');
  if (m.published.includes(article)) { console.log(`⏭️ "${article}" already published`); return; }
  if (m.scheduled.includes(article)) { console.log(`⏭️ "${article}" already scheduled`); return; }
  m.scheduled.push(article);
  saveManifest(m);
  console.log(`✅ "${article}" scheduled`);
}

function removeScheduled(name) {
  const m = loadManifest();
  const idx = m.scheduled.findIndex(s => s.includes(name));
  if (idx === -1) { console.error(`❌ "${name}" not found in scheduled`); return; }
  const removed = m.scheduled.splice(idx, 1)[0];
  saveManifest(m);
  console.log(`✅ "${removed}" removed from scheduled`);
}

function showNext() {
  const m = loadManifest();
  if (m.scheduled.length === 0) { console.log('📭 No scheduled articles'); return; }
  console.log(`📅 Next: ${m.scheduled[0]}`);
  console.log(`   Remaining in queue: ${m.scheduled.length - 1}`);
}

// ── Main ──
import { readdirSync } from 'fs';

const cmd = process.argv[2];
const arg = process.argv[3];

switch (cmd) {
  case 'list': listArticles(); break;
  case 'add': addScheduled(arg); break;
  case 'remove': removeScheduled(arg); break;
  case 'next': showNext(); break;
  default:
    console.log('Usage:');
    console.log('  node scripts/schedule.mjs list');
    console.log('  node scripts/schedule.mjs add <name>');
    console.log('  node scripts/schedule.mjs remove <name>');
    console.log('  node scripts/schedule.mjs next');
}
