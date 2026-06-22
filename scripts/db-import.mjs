/**
 * db-import.mjs
 * post-note/*.md → SQLite にインポート（seedデータ投入）
 *
 * 使い方:
 *   node scripts/db-import.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const POST_NOTE = resolve(ROOT, '..', '..', 'post-note');
const DB_PATH = resolve(ROOT, 'qiita.sqlite');

if (!existsSync(POST_NOTE)) {
  // Fallback: check within repo
  const alt = resolve(ROOT, 'articles');
  if (existsSync(alt)) {
    POST_NOTE = alt;
  } else {
    console.error('❌ post-note/ not found');
    process.exit(1);
  }
}

// lazy sqlite wrapper
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function main() {
  // Use better-sqlite3 if available, else shell out
  let db;
  try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
  } catch {
    console.log('⚠️  better-sqlite3 not installed, using sqlite3 CLI');
    await importViaCLI();
    return;
  }

  const files = readdirSync(POST_NOTE).filter(f => f.endsWith('.md'));
  const insert = db.prepare(`INSERT OR IGNORE INTO articles (series_id, file_name, title, body_md, char_count, tags) VALUES (?, ?, ?, ?, ?, ?)`);

  let count = 0;
  for (const f of files) {
    const md = readFileSync(resolve(POST_NOTE, f), 'utf8');
    const { title, body, tags } = parseMarkdown(md, f);

    insert.run('speech-ai', f, title, body, [...body].length, JSON.stringify(tags));
    count++;
  }

  console.log(`✅ Imported ${count} articles to speech-ai series`);
  db.close();
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

async function importViaCLI() {
  const files = readdirSync(POST_NOTE).filter(f => f.endsWith('.md'));
  let count = 0;

  for (const f of files) {
    const md = readFileSync(resolve(POST_NOTE, f), 'utf8');
    const { title, body, tags } = parseMarkdown(md, f);
    const escaped = body.replace(/'/g, "''");
    const tagsJson = JSON.stringify(tags);
    const cmd = `sqlite3 "${DB_PATH}" "INSERT OR IGNORE INTO articles (series_id, file_name, title, body_md, char_count, tags) VALUES ('speech-ai', '${f}', '${title.replace(/'/g, "''")}', '${escaped.substring(0, 1000)}...', ${[...body].length}, '${tagsJson.replace(/'/g, "''")}')"`;
    // Use short version via temp SQL file
    count++;
  }

  // Batch insert via SQL file
  const sqlPath = resolve(ROOT, 'tmp_import.sql');
  let sql = '';
  for (const f of files) {
    const md = readFileSync(resolve(POST_NOTE, f), 'utf8');
    const { title, body, tags } = parseMarkdown(md, f);
    // Store truncated body in SQL, full body as separate
    const size = [...body].length;
    sql += `INSERT OR IGNORE INTO articles (series_id, file_name, title, char_count, tags) VALUES ('speech-ai', '${f.replace(/'/g, "''")}', '${title.replace(/'/g, "''")}', ${size}, '${JSON.stringify(tags).replace(/'/g, "''")}');\n`;
    count++;
  }
  writeFileSync(sqlPath, sql);

  const { execSync } = await import('child_process');
  execSync(`sqlite3 "${DB_PATH}" < "${sqlPath}"`, { stdio: 'inherit' });
  execSync(`del "${sqlPath}"`, { shell: true });

  console.log(`✅ Imported ${count} articles (metadata only, body truncated)`);
}

import { writeFileSync } from 'fs';
main().catch(e => console.error(e.message));
