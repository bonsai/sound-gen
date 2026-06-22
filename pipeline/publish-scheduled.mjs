/**
 * publish-scheduled.mjs
 * manifest.json の scheduled から次の記事を Qiita 下書き投稿 + 更新
 *
 * 使い方:
 *   node pipeline/publish-scheduled.mjs                    # 次の1件を下書き投稿
 *   node pipeline/publish-scheduled.mjs --publish         # 次の1件を公開
 *   node pipeline/publish-scheduled.mjs --all              # 全scheduledを一気に投稿
 *   node pipeline/publish-scheduled.mjs --slow             # 1件投稿して停止（429対策）
 *   node pipeline/publish-scheduled.mjs --check-updates    # 更新が必要な記事を表示
 *   node pipeline/publish-scheduled.mjs --update           # 更新があった記事だけPATCH
 *   node pipeline/publish-scheduled.mjs --update-all       # 全published記事を強制PATCH
 *
 * 事前に schedule.mjs add <name> でスケジュール登録が必要
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = resolve(__dirname, '..', 'articles', 'manifest.json');
const ARTICLES_DIR = resolve(__dirname, '..', 'articles');
const ENV_PATH = resolve(__dirname, '..', '.env.qiita');

function loadEnv() {
  if (process.env.QIITA_API_TOKEN) return process.env.QIITA_API_TOKEN;
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

function fileHash(md) {
  return createHash('sha256').update(md, 'utf8').digest('hex').slice(0, 12);
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

async function patchQiita(token, qiitaId, title, body, tags) {
  const res = await fetch(`https://qiita.com/api/v2/items/${qiitaId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      tags: tags.map(t => ({ name: t })),
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
    console.error(`❌ File not found: ${articleName}.md`);
    return false;
  }

  const md = readFileSync(filePath, 'utf8');
  const { title, body, tags } = parseMarkdown(md, articleName);
  const allTags = [...new Set([...(manifest.tags || []), ...tags])].slice(0, 5);

  console.log(`📝 Posting: "${title}" (${[...body].length} chars)`);
  process.stdout.write('   🚀 Sending...');

  try {
    const article = await postToQiita(token, title, body, allTags, isDraft);
    console.log(' ✅');
    console.log(`   🔗 ${article.url}`);
    console.log(`   🆔 ${article.id}`);

    manifest.scheduled = manifest.scheduled.filter(s => s !== articleName);
    if (!manifest.published.includes(articleName)) {
      manifest.published.push(articleName);
    }
    if (!manifest.updated_map) manifest.updated_map = {};
    manifest.updated_map[articleName] = { hash: fileHash(md), qiita_id: article.id };
    saveManifest(manifest);
    return true;
  } catch (e) {
    console.log(` ❌`);
    console.error(`   ${e.message}`);
    return false;
  }
}

async function updateOne(token, articleName, manifest) {
  const map = manifest.updated_map || {};
  const entry = map[articleName];
  if (!entry?.qiita_id) {
    console.log(`   ⏭️  ${articleName}: no Qiita ID (was it published here?)`);
    return false;
  }

  const filePath = resolve(ARTICLES_DIR, `${articleName}.md`);
  if (!existsSync(filePath)) {
    console.log(`   ⏭️  ${articleName}: file missing`);
    return false;
  }

  const md = readFileSync(filePath, 'utf8');
  const currentHash = fileHash(md);
  if (currentHash === entry.hash) {
    console.log(`   ✅ ${articleName}: up to date`);
    return false;
  }

  const { title, body, tags } = parseMarkdown(md, articleName);
  const allTags = [...new Set([...(manifest.tags || []), ...tags])].slice(0, 5);

  console.log(`   📝 Updating: "${title}" (hash ${entry.hash} → ${currentHash})`);
  process.stdout.write('      🚀 Patching...');

  try {
    await patchQiita(loadEnv(), entry.qiita_id, title, body, allTags);
    console.log(' ✅');
    entry.hash = currentHash;
    saveManifest(manifest);
    return true;
  } catch (e) {
    console.log(` ❌`);
    console.error(`      ${e.message}`);
    return false;
  }
}

async function checkUpdates(manifest) {
  const map = manifest.updated_map || {};
  const changed = [];

  for (const name of manifest.published) {
    const entry = map[name];
    if (!entry?.qiita_id) {
      changed.push({ name, status: 'no_qiita_id' });
      continue;
    }
    const filePath = resolve(ARTICLES_DIR, `${name}.md`);
    if (!existsSync(filePath)) {
      changed.push({ name, status: 'file_missing' });
      continue;
    }
    const md = readFileSync(filePath, 'utf8');
    const currentHash = fileHash(md);
    if (currentHash !== entry.hash) {
      changed.push({ name, status: 'changed', oldHash: entry.hash, newHash: currentHash });
    }
  }

  return changed;
}

async function main() {
  const isAll = process.argv.includes('--all');
  const isSlow = process.argv.includes('--slow');
  const isPublish = process.argv.includes('--publish');
  const isCheckUpdates = process.argv.includes('--check-updates');
  const isUpdate = process.argv.includes('--update');
  const isUpdateAll = process.argv.includes('--update-all');
  const token = loadEnv();
  const manifest = loadManifest();

  // ── Check updates mode ──
  if (isCheckUpdates) {
    const changed = await checkUpdates(manifest);
    if (changed.length === 0) {
      console.log('✅ All published articles are up to date');
      return;
    }
    console.log(`📋 ${changed.length} article(s) need update:\n`);
    for (const c of changed) {
      const statusIcon = c.status === 'changed' ? '🔄' : c.status === 'no_qiita_id' ? '⚠️' : '❌';
      console.log(`   ${statusIcon} ${c.name} (${c.status})`);
    }
    return;
  }

  // ── Update mode ──
  if (isUpdate || isUpdateAll) {
    const changed = isUpdateAll
      ? manifest.published.map(n => ({ name: n, status: 'force' }))
      : await checkUpdates(manifest);

    const filtered = changed.filter(c => c.status === 'changed' || c.status === 'force');
    if (filtered.length === 0) {
      console.log('✅ No articles need updating');
      return;
    }

    console.log(`📋 Updating ${filtered.length} article(s)...\n`);
    let ok = 0;
    for (const c of filtered) {
      const success = await updateOne(token, c.name, manifest);
      if (success) ok++;
      if (isSlow) {
        console.log('   ⏳ Waiting 3s for rate limit...');
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    console.log(`\n✅ Updated ${ok}/${filtered.length} article(s)`);
    return;
  }

  // ── Publish mode ──
  if (manifest.scheduled.length === 0) {
    console.log('📭 No scheduled articles. Use: node pipeline/schedule.mjs add <name>');
    return;
  }

  if (isAll) {
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
