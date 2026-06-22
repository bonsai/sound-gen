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

const NAME_MAP = {
  'Attention': 'attention', 'CAVLS': 'cavls', 'CLAP': 'clap',
  'ConsistencyModel': 'consistency_model', 'DAC': 'dac',
  'Decoder': 'decoder', 'DiT': 'dit', 'Encoder': 'encoder',
  'Full-Duplex': 'full_duplex', 'LEAF': 'leaf', 'MeanFlow': 'meanflow',
  'MOS': 'mos', 'Moshi_KAME': 'moshi_kame', 'NeuralSVB': 'neural_svb',
  'Prosody': 'prosody', 'S2S生成': 's2s_gen', 'S3R': 's3r',
  'SpeechLM': 'speechlm', 'SSM': 'ssm', 'SUPERB': 'superb',
  'SVC': 'svc', 'SVS': 'svs', 'Transformer': 'transformer',
  'TTS': 'tts', 'VAD': 'vad', 'VAP': 'vap', 'VBR_CBR': 'vbr_cbr',
  'VoiceBox': 'voicebox', 'VRVQ': 'vrvq', 'Warmup': 'warmup',
  'ニューラルオーディオ': 'neural_audio', 'フローマッチング': 'flow_matching',
  'メルスペクトログラム': 'melspectrogram', '声クローン': 'voice_clone',
  '環境音生成': 'sound_gen', '環境音生成2': 'sound_gen_2',
  '環境音生成3': 'sound_gen_3',
  '画像生成と音声生成の双幅的展開': 'image_audio_evolution',
  '過剰平滑化': 'over_smoothing', '離散トークン': 'discrete_tokens',
  '音声コーデック': 'audio_codec', '音声トークン': 'audio_tokens',
  '音源分離': 'source_separation',
};

function slugify(name) {
  const clean = name.replace('親子対話：', '');
  if (NAME_MAP[clean]) return NAME_MAP[clean];
  return clean
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
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
