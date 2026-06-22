/**
 * seed/generate.mjs
 * 既存記事を SEED にして、関連ネタをポリネーション（受粉）する
 *
 * 使い方:
 *   node seed/generate.mjs               # speech-ai の seed を生成
 *   node seed/generate.mjs --series=all  # 全シリーズ
 *   node seed/generate.mjs --apply       # 生成と同時に seeds テーブルに保存
 *
 * ポリネーションルール:
 *   - 記事のタグ・タイトルから関連キーワードを抽出
 *   - 未カバーの概念を提案（例: 音声AIで書いてない → VQL, A2A, ...）
 *   - 既存記事の「さらに深掘り」候補
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ARTICLES_DIR = resolve(ROOT, 'articles');

// ── 全記事をパース ──
function loadAllArticles() {
  return readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const md = readFileSync(resolve(ARTICLES_DIR, f), 'utf8');
      const lines = md.split('\n');
      let tags = [], lineIdx = 0;
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
      const title = h1 ? h1[1].trim() : f.replace('.md', '');
      const body = content.replace(/^#\s+.+\n/m, '').trim();
      return { file: f, title, body, tags, charCount: [...body].length };
    });
}

// ── 既存カバレッジから不足ネタを推測 ──
const SEED_CATALOG = {
  'speech-ai': {
    uncovered: [
      { title: 'VQL (Vector Quantized Language Model)', keywords: ['VQ', 'VQ-VAE', '離散表現', '言語モデル'], note: '音声トークン＋言語モデルの統合' },
      { title: 'GSLM (Generative Spoken Language Model)', keywords: ['GSLM', '生成モデル', '教師なし'], note: 'Facebookの教師なし音声LM' },
      { title: 'TWIST (Text With Speech)', keywords: ['TWIST', 'テキスト+音声'], note: 'Googleの音声×テキスト共同学習' },
      { title: 'AudioPaLM', keywords: ['AudioPaLM', 'Google', 'PaLM'], note: 'Googleの音声言語モデル (PaLM統合)' },
      { title: 'HuBERT / WavLM 詳細', keywords: ['HuBERT', 'WavLM', '自己教師あり'], note: 'S3Rの深掘り' },
      { title: 'Wav2Vec 2.0 詳細', keywords: ['wav2vec', 'quantization', '対照学習'], note: 'S3Rの原点' },
      { title: 'VALL-E / VALL-E 2', keywords: ['VALL-E', 'コードック', 'TTS'], note: '離散トークン×TTSの代表的モデル' },
      { title: 'SpearTTS / SPEAR', keywords: ['SpearTTS', 'Google', '読み上げ'], note: 'GoogleのS2S TTS' },
      { title: 'AudioLM / MAGNet / MusicLM', keywords: ['AudioLM', 'MAGNet', 'MusicLM'], note: 'Googleの音声/音楽生成シリーズ' },
      { title: 'SNAC (Multi-Scale Neural Audio Codec)', keywords: ['SNAC', '多スケール', 'コーデック'], note: '階層的フレームレートのコーデック' },
      { title: 'Mimi (Kyutai)', keywords: ['Mimi', 'Kyutai', '11kbps'], note: 'Moshiのコーデック' },
      { title: '自然言語処理×音声の融合', keywords: ['NLU', 'ASR', 'マルチモーダル'], note: 'テキストと音声の境界を超えて' },
      { title: '音声強調 (Speech Enhancement)', keywords: ['音声強調', 'SE', 'ノイズ除去'], note: 'ノイズ除去・残響除去の基本' },
      { title: '話者認識 (Speaker Recognition)', keywords: ['話者認識', '話者識別', '話者照合'], note: '話者照合・話者識別・話者分類' },
      { title: '音声透かし / Audio Watermarking', keywords: ['AudioSeal', '透かし', '検出'], note: 'Meta AudioSeal, 音声改ざん検出' },
      { title: '感情音声合成 (Expressive TTS)', keywords: ['情感', '韻律', '感情合成'], note: '感情・スタイル制御のTTS' },
      { title: '歌声合成の詳細 (DiffSinger深掘り)', keywords: ['DiffSinger', '歌声', 'SVS'], note: 'SVS記事の深掘り' },
      { title: '音声バイアス / Fairness', keywords: ['バイアス', '公平性', '話者多様性'], note: '話者属性による性能格差問題' },
      { title: 'Few-shot / Zero-shot Voice Adaptation', keywords: ['few-shot', 'zero-shot', '適応'], note: '少量データでの声質適応' },
      { title: '音声と音楽の統合生成', keywords: ['音楽', 'マルチモーダル', '歌声'], note: 'SVS + 音楽生成の融合' },
    ]
  },
  'godot-pwa': {
    uncovered: [
      { title: 'Godot 4 の新機能解説', keywords: ['Godot4', '新機能', 'アップデート'], note: 'Godot4特有の機能' },
      { title: 'PWAのオフライン戦略', keywords: ['PWA', 'オフライン', 'Cache API'], note: 'Service Worker詳細' },
    ]
  }
};

function generateSeeds(series, articles) {
  const catalog = SEED_CATALOG[series];
  if (!catalog) return [];

  const existingTitles = new Set(articles.map(a => a.title));
  const existingTags = new Set(articles.flatMap(a => a.tags));

  const seeds = catalog.uncovered
    .filter(s => !existingTitles.has(s.title))
    .map(s => ({
      source_series: series,
      title: s.title,
      keywords: s.keywords,
      priority: s.keywords.some(k => existingTags.has(k)) ? 8 : 5,
      note: s.note,
      status: 'seed'
    }));

  return seeds;
}

// ── DB保存 ──
function saveToDB(seeds) {
  const { execSync } = require('child_process');
  const db = resolve(ROOT, 'qiita.sqlite');
  for (const s of seeds) {
    const title = s.title.replace(/'/g, "''");
    const desc = s.note.replace(/'/g, "''");
    const kw = JSON.stringify(s.keywords).replace(/'/g, "''");
    const cmd = `sqlite3 "${db}" "INSERT INTO seeds (source_id, title, description, keywords, priority, status) VALUES (NULL, '${title}', '${desc}', '${kw}', ${s.priority}, 'seed');"`;
    try { execSync(cmd, { stdio: 'pipe' }); } catch {}
  }
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);
  const targetSeries = args.find(a => a.startsWith('--series='))?.split('=')[1] || 'speech-ai';
  const doApply = args.includes('--apply');

  const articles = loadAllArticles();
  const series = targetSeries === 'all'
    ? Object.keys(SEED_CATALOG)
    : [targetSeries];

  let allSeeds = [];
  for (const s of series) {
    const seriesArticles = s === 'speech-ai'
      ? articles
      : [];
    const seeds = generateSeeds(s, seriesArticles);
    allSeeds = allSeeds.concat(seeds);

    console.log(`\n🌱 ${s}: ${seeds.length} seeds generated`);
    for (const seed of seeds) {
      console.log(`   [P${seed.priority}] ${seed.title}`);
      console.log(`       ↳ ${seed.note}`);
    }
  }

  if (doApply && allSeeds.length > 0) {
    saveToDB(allSeeds);
    console.log(`\n💾 Saved ${allSeeds.length} seeds to qiita.sqlite`);
  }

  console.log(`\n📊 Total: ${articles.length} existing → ${allSeeds.length} new seeds`);
  if (!doApply) {
    console.log('\n💡 To save: node seed/generate.mjs --apply');
  }
}

main().catch(e => console.error(e.message));
