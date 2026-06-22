/**
 * scripts/gen-colabs.mjs
 * 全記事に対応する Colab POC ノートブックを一括生成
 *
 * 使い方:
 *   node scripts/gen-colabs.mjs              # 全43記事のColabを生成
 *   node scripts/gen-colabs.mjs --poc        # 既存POCのみ（スキップ）
 *
 * 各 Colab は「実行確認可能な最小限のPOC」を目指す。
 * 記事にはコードを書かず、文末に Colab リンクを貼る。
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ARTICLES_DIR = resolve(ROOT, 'articles');
const COLABS_DIR = resolve(ROOT, 'colabs');

// POC 実装一覧（手動で充実させたものは上書きしない）
const EXISTING_POCS = [
  'poc_melspectrogram.ipynb',
  'poc_vad.ipynb',
];

// 各記事に適した Colab の内容を定義
const COLAB_TEMPLATES = {
  default: {
    title: 'POC: {title_short}',
    install: '!pip install -q torch numpy matplotlib',
    code: `# TODO: POC implementation for {title}
# See article: {article_path}

# Basic setup
import numpy as np
import matplotlib.pyplot as plt

print("✅ POC scaffold for: {title}")
print("📖 Implement your demo below")
`,
    summary: `### 📝 まとめ\nTODO\n\n🔗 [記事を読む]({article_url})`
  },
  // Specific templates for key articles
  '音源分離': {
    install: '!pip install -q demucs torchaudio',
    code: `# Source Separation with Demucs (Hybrid Transformer)
import torchaudio
import torch

# Download sample
!wget -q -O mix.wav https://github.com/bonsai/sound-gen/raw/main/colabs/samples/mixture.wav 2>/dev/null || \\
  !echo "Download sample from DEMUCS repo directly"

from demucs import pretrained
from demucs.apply import apply_model
from demucs.audio import AudioFile

try:
  model = pretrained.get_model('htdemucs')
  print(f"✅ Demucs loaded: {model.__class__.__name__}")
except Exception as e:
  print(f"⚠️  Demucs load issue: {e}")
  print("Install: pip install demucs")
`,
    title: 'POC: 音源分離 (Demucs)'
  },
  'TTS': {
    install: '!pip install -q TTS torch',
    code: `# Text-to-Speech with Coqui-TTS
from TTS.api import TTS

# Load a lightweight model
tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False)

# Generate speech
text = "Welcome to the parent-child dialogue series on audio AI."
tts.tts_to_file(text=text, file_path="output.wav")

import IPython.display as ipd
ipd.Audio("output.wav")
`,
    title: 'POC: TTS (Coqui)'
  },
  'Attention': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Attention Mechanism Visualizer
import torch
import torch.nn.functional as F
import matplotlib.pyplot as plt
import numpy as np

# Simple self-attention
seq_len, d_model = 10, 8
x = torch.randn(1, seq_len, d_model)
W_q = torch.randn(d_model, d_model)
W_k = torch.randn(d_model, d_model)

Q = x @ W_q
K = x @ W_k
scores = Q @ K.transpose(-2, -1) / (d_model ** 0.5)
attn = F.softmax(scores, dim=-1)

plt.figure(figsize=(6, 5))
plt.imshow(attn[0].detach().numpy(), cmap='viridis')
plt.colorbar(label='Attention Weight')
plt.title('Self-Attention Weights')
plt.xlabel('Key Position')
plt.ylabel('Query Position')
plt.show()
`,
    title: 'POC: Attention'
  },
  'Transformer': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Minimal Transformer Block
import torch
import torch.nn as nn

class TinyTransformer(nn.Module):
  def __init__(self, d_model=64, nhead=4):
    super().__init__()
    self.attn = nn.MultiheadAttention(d_model, nhead, batch_first=True)
    self.ffn = nn.Sequential(
      nn.Linear(d_model, d_model*4),
      nn.ReLU(),
      nn.Linear(d_model*4, d_model)
    )
    self.norm1 = nn.LayerNorm(d_model)
    self.norm2 = nn.LayerNorm(d_model)

  def forward(self, x):
    x2 = self.norm1(x + self.attn(x, x, x)[0])
    return self.norm2(x2 + self.ffn(x2))

model = TinyTransformer()
x = torch.randn(2, 10, 64)
out = model(x)
print(f"✅ Transformer block: {x.shape} → {out.shape}")
`,
    title: 'POC: Transformer'
  },
  'Encoder': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Simple Audio Encoder (Autoencoder)
import torch
import torch.nn as nn

class AudioEncoder(nn.Module):
  def __init__(self):
    super().__init__()
    self.conv = nn.Sequential(
      nn.Conv1d(1, 16, 3, 2, 1), nn.ReLU(),
      nn.Conv1d(16, 32, 3, 2, 1), nn.ReLU(),
      nn.Conv1d(32, 64, 3, 2, 1), nn.ReLU(),
    )

  def forward(self, x):
    return self.conv(x)

model = AudioEncoder()
dummy = torch.randn(1, 1, 16000)
out = model(dummy)
print(f"Encoder: 16000 samples → {out.shape[2]} frames × {out.shape[1]} channels")
print(f"✅ Compression ratio: {16000 / out.shape[2]:.1f}x")
`,
    title: 'POC: Encoder'
  },
  'Decoder': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Simple Audio Decoder
import torch
import torch.nn as nn

class AudioDecoder(nn.Module):
  def __init__(self):
    super().__init__()
    self.deconv = nn.Sequential(
      nn.ConvTranspose1d(64, 32, 4, 2, 1), nn.ReLU(),
      nn.ConvTranspose1d(32, 16, 4, 2, 1), nn.ReLU(),
      nn.ConvTranspose1d(16, 1, 4, 2, 1), nn.Tanh(),
    )

  def forward(self, x):
    return self.deconv(x)

model = AudioDecoder()
latent = torch.randn(1, 64, 125)
out = model(latent)
print(f"Decoder: 125 frames → {out.shape[2]} samples")
print(f"✅ Reconstruction: upscaling factor = {out.shape[2] / 125:.0f}x")
`,
    title: 'POC: Decoder'
  },
  'CLAP': {
    install: '!pip install -q transformers torch',
    code: `# CLAP: Contrastive Language-Audio Pretraining
from transformers import ClapModel, ClapProcessor
import torch

model = ClapModel.from_pretrained("laion/clap-htsat-unfused")
processor = ClapProcessor.from_pretrained("laion/clap-htsat-unfused")

texts = ["a dog barking", "rain on window", "someone singing"]
audio = torch.randn(1, 48000)  # dummy audio

inputs = processor(text=texts, audios=audio, return_tensors="pt", padding=True)
outputs = model(**inputs)
sim = outputs.logits_per_audio.softmax(dim=-1)

print("✅ CLAP similarity scores (dummy audio):")
for i, t in enumerate(texts):
  print(f"   {t}: {sim[0][i]:.3f}")
`,
    title: 'POC: CLAP'
  },
  'Full-Duplex': {
    install: '!pip install -q torch numpy',
    code: `# Full-Duplex: Simulate barge-in detection
# POC: align two audio streams
import numpy as np
import matplotlib.pyplot as plt

# Simulate overlapping speech
sr = 16000
t = np.linspace(0, 3, sr*3)
voice_a = np.sin(2*np.pi*200*t) * np.exp(-2*t) * (t < 1.5)
voice_b = np.sin(2*np.pi*300*t) * np.exp(-2*(t-1.5)) * (t > 1.5) * (t < 2.5)
overlap = voice_a + voice_b

plt.figure(figsize=(12, 4))
plt.plot(t, voice_a, label='User A', alpha=0.7)
plt.plot(t, voice_b, label='User B (barge-in)', alpha=0.7)
plt.plot(t, overlap, label='Mixed', alpha=0.5, color='gray')
plt.axvspan(1.5, 2.5, alpha=0.1, color='red', label='Overlap region')
plt.xlabel('Time (s)')
plt.legend()
plt.title('Full-Duplex: Overlapping Speech (Barge-in)')
plt.show()
`,
    title: 'POC: Full-Duplex'
  },
  '音声コーデック': {
    install: '!pip install -q encodec torchaudio',
    code: `# Neural Audio Codec (EnCodec POC)
!pip install -q encodec torchaudio

from encodec import EncodecModel
from encodec.utils import convert_audio
import torchaudio
import torch

# Load EnCodec
model = EncodecModel.encodec_model_24khz()

# Generate sine wave
sr = 24000
t = torch.linspace(0, 2, sr*2)
audio = torch.sin(2*torch.pi*440*t).unsqueeze(0).unsqueeze(0)

# Encode/Decode
with torch.no_grad():
  encoded = model.encode(audio)
  decoded = model.decode(encoded)

print(f"Original:  {audio.shape[-1]} samples")
print(f"Compressed: {encoded[0][0].shape[-1]} frames")
print(f"✅ Compression ratio: {audio.shape[-1] / encoded[0][0].shape[-1]:.0f}x")
`,
    title: 'POC: 音声コーデック (EnCodec)'
  },
  '音声トークン': {
    install: '!pip install -q torch numpy',
    code: `# Audio Tokenization: VQ-VAE concept
import torch
import torch.nn as nn

# Minimal Vector Quantization
class VectorQuantizer(nn.Module):
  def __init__(self, n_embeds=128, embed_dim=64):
    super().__init__()
    self.codebook = nn.Embedding(n_embeds, embed_dim)

  def forward(self, z):
    B, C, T = z.shape
    flat = z.permute(0, 2, 1).reshape(-1, C)
    dist = torch.cdist(flat, self.codebook.weight)
    indices = dist.argmin(dim=-1)
    return indices.reshape(B, T)

quantizer = VectorQuantizer()
z = torch.randn(2, 64, 100)
tokens = quantizer(z)
print(f"Continuous: {z.shape} → Discrete tokens: {tokens.shape}")
print(f"✅ {z.shape[1]}D vectors mapped to codebook of {quantizer.codebook.num_embeddings}")
`,
    title: 'POC: 音声トークン (VQ)'
  },
};

function slugify(name) {
  return name
    .replace(/[：:]/g, '_')
    .replace(/[^a-zA-Z0-9_\u3000-\u9FFF]/g, '')
    .replace(/\s+/g, '_');
}

function genNotebook(article, template) {
  const name = article.replace('親子対話：', '').replace('.md', '');
  const title = (template.title || 'POC: {title_short}').replace('{title_short}', name);

  const cells = [
    { cell_type: 'markdown', source: [`# ${title}\n\n📖 対応記事: \`${article.replace('.md', '')}\``, '', '🔗 [記事を読む](articles/' + article + ')'] },
    { cell_type: 'code', source: ['# @title Setup\n' + (template.install || '!pip install -q torch numpy matplotlib')] },
    { cell_type: 'code', source: ['# @title Demo\n' + template.code] },
    { cell_type: 'markdown', source: ['---\n' + template.summary] },
  ];

  return {
    nbformat: 4, nbformat_minor: 0,
    metadata: {
      accelerator: 'GPU',
      colab: { provenance: [], name: title },
      kernelspec: { display_name: 'Python 3', name: 'python3' }
    },
    cells: cells.map(c => ({
      cell_type: c.cell_type,
      source: Array.isArray(c.source) ? c.source : [c.source],
      metadata: {},
      execution_count: null,
      outputs: []
    }))
  };
}

function main() {
  if (!existsSync(COLABS_DIR)) mkdirSync(COLABS_DIR, { recursive: true });

  const articles = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
  let count = 0;

  for (const article of articles) {
    const name = article.replace('親子対話：', '').replace('.md', '');
    const colabName = `poc_${slugify(article.replace('.md', ''))}.ipynb`;
    const colabPath = resolve(COLABS_DIR, colabName);

    // Skip existing POCs
    if (existsSync(colabPath)) {
      console.log(`⏭️  ${colabName} (exists)`);
      continue;
    }

    // Find template
    let template = COLAB_TEMPLATES[name] || COLAB_TEMPLATES[Object.keys(COLAB_TEMPLATES).find(k => name.includes(k))];

    if (!template) {
      template = {
        ...COLAB_TEMPLATES.default,
        title: `POC: ${name}`,
        summary: `### 📝 まとめ\nTODO: Implement POC for ${name}\n\n🔗 [記事を読む](https://github.com/bonsai/sound-gen/blob/main/articles/${article})`
      };
    }

    const notebook = genNotebook(article, template);
    writeFileSync(colabPath, JSON.stringify(notebook, null, 1));
    count++;
  }

  console.log(`\n✅ Generated ${count} Colab notebooks`);
  console.log(`📊 Total: ${readdirSync(COLABS_DIR).filter(f => f.endsWith('.ipynb')).length} notebooks`);
}

main();
