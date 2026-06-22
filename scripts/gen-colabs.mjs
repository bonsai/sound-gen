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
const FORCE = process.argv.includes('--force');
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
  'メルスペクトログラム': {
    install: '!pip install -q torch numpy matplotlib librosa',
    code: `# Mel Spectrogram Computation
import numpy as np
import matplotlib.pyplot as plt
import librosa
import librosa.display

# Generate audio: chirp from low to high
sr = 22050
t = np.linspace(0, 2, sr*2)
audio = np.sin(2*np.pi * (200 + 1000*t) * t)

# Compute mel spectrogram
mel = librosa.feature.melspectrogram(y=audio, sr=sr, n_mels=64, fmax=8000)
mel_db = librosa.power_to_db(mel, ref=np.max)

plt.figure(figsize=(10, 4))
librosa.display.specshow(mel_db, sr=sr, x_axis='time', y_axis='mel', fmax=8000)
plt.colorbar(format='%+2.0f dB')
plt.title('Mel Spectrogram (Chirp 200→2200 Hz)')
plt.tight_layout()
plt.show()

print(f"Mel shape: {mel.shape} (freq_bins × time_frames)")
print(f"Compression: {sr}Hz → {mel.shape[0]} mel bands")`,
    title: 'POC: Mel Spectrogram'
  },
  'S2S生成': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Sequence-to-Sequence Generation
import torch
import torch.nn as nn
import matplotlib.pyplot as plt

# Minimal Seq2Seq with attention
class Encoder(nn.Module):
  def __init__(self, vocab=32, dim=64):
    super().__init__()
    self.embed = nn.Embedding(vocab, dim)
    self.lstm = nn.LSTM(dim, dim, batch_first=True)
  def forward(self, x):
    return self.lstm(self.embed(x))

class Decoder(nn.Module):
  def __init__(self, vocab=32, dim=64):
    super().__init__()
    self.embed = nn.Embedding(vocab, dim)
    self.lstm = nn.LSTM(dim, dim, batch_first=True)
    self.out = nn.Linear(dim, vocab)
  def forward(self, x, hidden):
    out, hidden = self.lstm(self.embed(x), hidden)
    return self.out(out), hidden

# Forward through dummy sequence
enc = Encoder()
dec = Decoder()
x = torch.randint(0, 32, (2, 10))
_, (h, c) = enc(x)
start = torch.zeros((2, 1), dtype=torch.long)
logits, _ = dec(start, (h, c))

print(f"Input tokens: {x.shape}")
print(f"Generated logits: {logits.shape}")
print(f"✅ Seq2Seq: encoder produces context → decoder generates step by step")`,
    title: 'POC: Seq2Seq Generation'
  },
  'S3R': {
    install: '!pip install -q torch numpy',
    code: `# Structured State Space for Speech
import torch
import torch.nn as nn

# Minimal S4-inspired layer
class S4Layer(nn.Module):
  def __init__(self, dim=32):
    super().__init__()
    self.dim = dim
    # Hippo-like initialization (simplified)
    dt = 0.01
    A = -torch.eye(dim) * 0.5
    B = torch.ones(dim, 1)
    C = torch.ones(1, dim)
    self.register_buffer('A', A)
    self.register_buffer('B', B)
    self.register_buffer('C', C)
    self.linear = nn.Linear(dim, dim)
  
  def forward(self, x):
    B, L, D = x.shape
    h = torch.zeros(B, D, device=x.device)
    outputs = []
    for t in range(L):
      h = h @ self.A.T + x[:, t] @ self.B.T
      y = h @ self.C.T
      outputs.append(y)
    out = torch.stack(outputs, dim=1)
    return self.linear(out)

model = S4Layer(32)
x = torch.randn(2, 50, 32)
out = model(x)
print(f"S4 Layer: {x.shape} → {out.shape}")
print(f"✅ SSM processes 50-length sequence with constant memory")`,
    title: 'POC: S3R / SSM'
  },
  'SpeechLM': {
    install: '!pip install -q transformers torch numpy',
    code: `# Speech Language Model (HuBERT + LM concept)
from transformers import Wav2Vec2Processor, HubertModel
import torch
import numpy as np

# Load HuBERT (speech encoder)
processor = Wav2Vec2Processor.from_pretrained("facebook/hubert-base-ls960")
model = HubertModel.from_pretrained("facebook/hubert-base-ls960")

# Generate sine wave speech
sr = 16000
t = np.linspace(0, 1, sr)
audio = np.sin(2*np.pi*440*t).astype(np.float32)

# Extract representations
inputs = processor(audio, sampling_rate=sr, return_tensors="pt")
with torch.no_grad():
  outputs = model(**inputs)
  reps = outputs.last_hidden_state

print(f"Input: 1 second @ {sr}Hz = {sr} samples")
print(f"HuBERT representations: {reps.shape}")
print(f"✅ SpeechLM compresses audio into semantic tokens ({reps.shape[1]} frames × {reps.shape[-1]} dim)")`,
    title: 'POC: SpeechLM (HuBERT)'
  },
  'SSM': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# State Space Models for Audio
import torch
import torch.nn as nn
import matplotlib.pyplot as plt

# Mamba-like selective SSM block (simplified)
class SelectiveSSM(nn.Module):
  def __init__(self, dim=16):
    super().__init__()
    self.fc_x = nn.Linear(dim, dim)
    self.fc_dt = nn.Linear(dim, dim)
    self.A_log = nn.Parameter(torch.randn(dim))
    self.D = nn.Parameter(torch.ones(dim))
  
  def forward(self, x):
    B, L, D = x.shape
    delta = torch.sigmoid(self.fc_dt(x))  # selective
    A = -torch.exp(self.A_log).view(1, 1, D)
    h = torch.zeros(B, D, device=x.device)
    ys = []
    for t in range(L):
      h = h * torch.exp(A * delta[:, t]) + self.fc_x(x[:, t])
      ys.append(h + self.D * x[:, t])
    return torch.stack(ys, dim=1)

model = SelectiveSSM(16)
x = torch.randn(2, 30, 16)
out = model(x)
print(f"Selective SSM: {x.shape} → {out.shape}")
print(f"✅ SSM processes sequences with O(L) memory, selective gates adapt per step")`,
    title: 'POC: Selective SSM'
  },
  'SUPERB': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# SUPERB Benchmark Concept
import torch
import numpy as np
import matplotlib.pyplot as plt

# Simulate SUPERB evaluation
tasks = ['PR', 'KS', 'IC', 'SID', 'ASR', 'SF']
models = ['HuBERT', 'WavLM', 'Wav2Vec2', 'Data2Vec']
scores = np.random.randn(len(models), len(tasks))
scores = (scores - scores.min()) / (scores.max() - scores.min()) * 100

fig, ax = plt.subplots(figsize=(10, 5))
im = ax.imshow(scores, cmap='viridis', aspect='auto')
ax.set_xticks(range(len(tasks)))
ax.set_yticks(range(len(models)))
ax.set_xticklabels(tasks)
ax.set_yticklabels(models)
plt.colorbar(im, label='Accuracy (%)')
plt.title('SUPERB Benchmark (simulated)')
plt.xlabel('Tasks: PR/KS/IC/SID/ASR/SF')
plt.ylabel('Self-Supervised Models')
plt.show()

print(f"✅ SUPERB: {len(models)} models × {len(tasks)} tasks = {len(models)*len(tasks)} evaluations")
print("Tasks: Phoneme Recognition, Keyword Spotting, Intent Classification, Speaker ID, ASR, Speaker Verification")`,
    title: 'POC: SUPERB'
  },
  'SVC': {
    install: '!pip install -q torch numpy matplotlib librosa soundfile',
    code: `# Singing Voice Conversion POC
import numpy as np
import matplotlib.pyplot as plt

# Simulate content → timbre conversion
sr = 22050
t = np.linspace(0, 0.5, int(sr*0.5))
source = np.sin(2*np.pi*440*t) * np.exp(-5*t)  # singer A
target = np.sin(2*np.pi*523*t) * np.exp(-5*t)   # singer B (higher pitch)

# F0 shift simulation
f0_ratio = 523.0 / 440.0
converted = np.interp(np.linspace(0, len(source), int(len(source)*f0_ratio)),
                       np.arange(len(source)), source)
converted = converted[:len(source)] if len(converted) > len(source) else np.pad(converted, (0, len(source)-len(converted)))

plt.figure(figsize=(12, 3))
plt.subplot(131); plt.plot(t, source); plt.title('Source (Singer A)'); plt.xlabel('Time (s)')
plt.subplot(132); plt.plot(t[:len(converted)], converted[:len(t)]); plt.title('Converted'); plt.xlabel('Time (s)')
plt.subplot(133); plt.plot(t, target); plt.title('Target (Singer B)'); plt.xlabel('Time (s)')
plt.tight_layout()
plt.show()

print(f"✅ SVC: preserves linguistic content, changes timbre/pitch")`,
    title: 'POC: SVC'
  },
  'SVS': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Singing Voice Synthesis POC
import numpy as np
import matplotlib.pyplot as plt

# Simulate singing synthesis: pitch contour + harmonics
sr = 16000
dur = 1.0
t = np.linspace(0, dur, int(sr*dur))

# Melody: C-E-G-C (ascending arpeggio)
notes = [262, 330, 392, 523]
seg_len = len(t) // 4
segments = []
for note in notes:
  seg = np.sin(2*np.pi*note * t[:seg_len])
  # Add harmonics
  seg += 0.5 * np.sin(2*np.pi*note*2 * t[:seg_len])
  seg += 0.25 * np.sin(2*np.pi*note*3 * t[:seg_len])
  env = np.exp(-2 * np.linspace(0, 1, seg_len))
  segments.append(seg * env)

melody = np.concatenate(segments)

plt.figure(figsize=(12, 3))
plt.specgram(melody, NFFT=1024, Fs=sr, cmap='inferno')
plt.title('SVS: Synthesized Singing (C-E-G-C arpeggio with harmonics)')
plt.ylabel('Frequency (Hz)')
plt.xlabel('Time (s)')
plt.ylim(0, 4000)
plt.colorbar(label='Intensity (dB)')
plt.show()

print(f"✅ SVS: generates singing from notes/text with pitch contour + timbre")`,
    title: 'POC: SVS'
  },
  'VAP': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Voice Activity Projection (turn-taking prediction)
import numpy as np
import matplotlib.pyplot as plt

# Simulate conversation turn-taking
sr = 100  # 100ms frames
dur = 10  # 10 second conversation
t = np.arange(0, dur, 0.1)

# Speaker A and B activity
speaker_a = (np.sin(2*np.pi*0.3*t) > 0.5).astype(float)
speaker_b = (np.sin(2*np.pi*0.3*t + 1.5) > 0.5).astype(float)
# Remove overlap
overlap = (speaker_a + speaker_b) > 1
speaker_a[overlap] = 0
speaker_b[overlap] = 0

# VAP: predict who will speak next
shift_a = np.roll(speaker_a, -3)  # predict 300ms ahead
shift_b = np.roll(speaker_b, -3)
vap_pred = np.where(shift_a > shift_b, 1, 0)

plt.figure(figsize=(12, 4))
plt.subplot(211)
plt.plot(t, speaker_a, label='Speaker A', drawstyle='steps-post')
plt.plot(t, speaker_b, label='Speaker B', drawstyle='steps-post')
plt.ylabel('Activity')
plt.legend()
plt.title('Conversation: Turn-taking')
plt.subplot(212)
plt.plot(t, vap_pred, label='VAP: who speaks next', drawstyle='steps-post', color='green')
plt.ylabel('Prediction (A=1, B=0)')
plt.xlabel('Time (s)')
plt.legend()
plt.tight_layout()
plt.show()

print(f"✅ VAP predicts next speaker 300ms ahead for smoother turn-taking")`,
    title: 'POC: VAP'
  },
  'VBR_CBR': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# VBR vs CBR: Bitrate Comparison
import numpy as np
import matplotlib.pyplot as plt

# Simulate audio complexity over time
t = np.linspace(0, 3, 300)
complexity = 0.3 + 0.7 * (t > 0.5) * (t < 1.5) + 0.5 * np.sin(2*np.pi*2*t)
complexity = np.clip(complexity, 0.1, 1.0)

# CBR: constant bitrate
cbr = np.ones_like(complexity) * 128

# VBR: adapts to complexity
vbr = 64 + 128 * complexity

plt.figure(figsize=(10, 5))
plt.subplot(211)
plt.plot(t, complexity, 'k-', lw=2)
plt.fill_between(t, 0, complexity, alpha=0.3)
plt.ylabel('Audio Complexity')
plt.title('Audio Complexity vs Bitrate')
plt.subplot(212)
plt.plot(t, cbr, 'r--', label=f'CBR (avg {cbr.mean():.0f} kbps)', lw=2)
plt.plot(t, vbr, 'b-', label=f'VBR (avg {vbr.mean():.0f} kbps)', lw=2)
plt.fill_between(t, 0, vbr, alpha=0.2, color='blue')
plt.xlabel('Time (s)')
plt.ylabel('Bitrate (kbps)')
plt.legend()
plt.tight_layout()
plt.show()

print(f"CBR: constant {cbr[0]:.0f} kbps throughout")
print(f"VBR: avg {vbr.mean():.0f} kbps (saves {100*(1-vbr.mean()/cbr.mean()):.0f}% vs CBR at same quality)")`,
    title: 'POC: VBR vs CBR'
  },
  'VRVQ': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Variable Rate RVQ (Sony ICASSP 2025)
import numpy as np
import matplotlib.pyplot as plt

# Simulate audio segments with different complexity
segments = ['Silence', 'Noise', 'Speech', 'Music', 'Complex']
complexity = np.array([0.05, 0.3, 0.5, 0.7, 1.0])
# VRVQ: allocate more codebook levels to complex frames
levels = np.ceil(complexity * 8).astype(int)  # 1-8 levels
cbr_levels = np.full_like(levels, 4)  # CBR baseline

x = np.arange(len(segments))
width = 0.35

plt.figure(figsize=(10, 5))
plt.bar(x - width/2, cbr_levels, width, label='CBR (fixed 4 levels)', color='lightcoral')
plt.bar(x + width/2, levels, width, label='VRVQ (variable levels)', color='steelblue')
plt.xticks(x, segments)
plt.ylabel('RVQ Levels')
plt.title('VRVQ: Variable Rate Residual Vector Quantization')
plt.legend()
plt.grid(axis='y', alpha=0.3)
plt.show()

print(f"VRVQ: silence uses {levels[0]} level, music uses {levels[-1]} levels")
print(f"Average levels: CBR={cbr_levels.mean():.1f}, VRVQ={levels.mean():.1f}")
print(f"✅ VRVQ allocates bits where they matter most (ICASSP 2025, Sony)")`,
    title: 'POC: VRVQ'
  },
  'VoiceBox': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# VoiceBox: Non-Autoregressive TTS (concept)
import numpy as np
import matplotlib.pyplot as plt

# Simulate VoiceBox: masked speech in-filling
sr = 16000
t = np.linspace(0, 2, sr*2)
audio = np.sin(2*np.pi*300*t) * (1 - 0.5*np.sin(2*np.pi*2*t))

# Create mask (remove middle portion)
mask = np.ones_like(audio)
mask[len(audio)//3:2*len(audio)//3] = 0

# Simulated infilling
filled = audio.copy()
filled[len(audio)//3:2*len(audio)//3] = np.sin(2*np.pi*300*t[len(audio)//3:2*len(audio)//3]) * (1 - 0.5*np.sin(2*np.pi*2*t[len(audio)//3:2*len(audio)//3])) * 0.8

plt.figure(figsize=(12, 3))
plt.subplot(311); plt.plot(t, audio); plt.title('Original Speech')
plt.subplot(312); plt.plot(t, audio * mask); plt.title('Masked Speech (missing middle)')
plt.subplot(313); plt.plot(t, filled); plt.title('VoiceBox: In-filled')
plt.tight_layout()
plt.show()

print(f"✅ VoiceBox: non-autoregressive, fills masked regions like BERT for speech")
print("Supports: zero-shot TTS, cross-lingual, noise removal, content editing")`,
    title: 'POC: VoiceBox'
  },
  'Warmup': {
    install: '!pip install -q torch matplotlib numpy',
    code: `# Learning Rate Warmup
import numpy as np
import matplotlib.pyplot as plt

def cosine_schedule(step, warmup_steps, total_steps, max_lr, min_lr):
  if step < warmup_steps:
    return max_lr * step / warmup_steps
  progress = (step - warmup_steps) / (total_steps - warmup_steps)
  return min_lr + 0.5 * (max_lr - min_lr) * (1 + np.cos(np.pi * progress))

total = 1000
warmup = 100
steps = np.arange(total)
lrs = [cosine_schedule(s, warmup, total, 1e-3, 1e-5) for s in steps]

plt.figure(figsize=(10, 4))
plt.plot(steps, lrs, 'b-', lw=2)
plt.axvline(warmup, color='r', linestyle='--', alpha=0.5, label=f'Warmup={warmup} steps')
plt.xlabel('Training Step')
plt.ylabel('Learning Rate')
plt.title('Cosine LR Schedule with Warmup')
plt.legend()
plt.grid(alpha=0.3)
plt.show()

print(f"✅ Warmup: {warmup} steps linear increase → cosine decay")
print(f"Peak LR: {max(lrs):.1e}, Final LR: {min(lrs):.1e}")
print("Prevents early divergence, especially for large models")`,
    title: 'POC: Warmup'
  },
  'ニューラルオーディオ': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Neural Audio: Taxonomy Overview
import numpy as np
import matplotlib.pyplot as plt

# Neural audio landscape as a tree diagram
categories = {
  'Generation': ['TTS', 'SVS', 'Music Gen', 'Sound FX'],
  'Conversion': ['SVC', 'Voice Clone', 'NeuralSVB'],
  'Codec': ['EnCodec', 'DAC', 'SoundStream', 'VRVQ'],
  'Separation': ['Demucs', 'SudoRM', 'OpenUnmix'],
  'Understanding': ['ASR', 'SID', 'Emotion', 'VAD'],
}

fig, ax = plt.subplots(figsize=(12, 6))
y_pos = np.arange(len(categories))
for i, (cat, items) in enumerate(categories.items()):
  for j, item in enumerate(items):
    ax.text(0.1 + j*0.2, 1 - i*0.15, f'{cat}: {item}',
            bbox=dict(boxstyle='round,pad=0.3', facecolor=plt.cm.Set3(i/len(categories)), alpha=0.8),
            fontsize=9)

ax.set_xlim(0, 1); ax.set_ylim(-0.5, 1.5)
ax.axis('off')
plt.title('Neural Audio: Taxonomy')
plt.show()

print("✅ Neural Audio spans 5 major categories:")
for cat, items in categories.items():
  print(f"   {cat}: {', '.join(items)}")
print(f"\nTotal subfields: {sum(len(v) for v in categories.values())}")`,
    title: 'POC: Neural Audio'
  },
  'フローマッチング': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Flow Matching for Audio Generation
import numpy as np
import matplotlib.pyplot as plt

# Simulate flow matching: linear interpolation from noise to data
n_steps = 20
x0 = np.random.randn(100) * 0.5  # noise
x1 = np.sin(np.linspace(0, 4*np.pi, 100))  # target (clean signal)

# Flow: t → velocity field
t_steps = np.linspace(0, 1, n_steps)
trajectories = []
for t in t_steps:
  xt = (1 - t) * x0 + t * x1  # linear ODE path
  trajectories.append(xt)

trajectories = np.array(trajectories)

plt.figure(figsize=(10, 5))
for i in range(0, n_steps, 4):
  plt.plot(trajectories[i] + i*0.5, color=plt.cm.viridis(i/n_steps), alpha=0.8)
plt.xlabel('Time Index')
plt.ylabel('Signal (offset by step)')
plt.title('Flow Matching: Noise → Clean Signal (t=0 → t=1)')
plt.yticks([])
plt.show()

print(f"✅ Flow Matching: learn velocity field v_t(x) that transports noise→data")
print(f"   Simpler training than diffusion (no score matching)")
print(f"   Used in: VoiceBox, NaturalSpeech 3, Matcha-TTS")`,
    title: 'POC: Flow Matching'
  },
  '声クローン': {
    install: '!pip install -q torch numpy matplotlib librosa',
    code: `# Voice Cloning: Speaker Adaptation
import numpy as np
import matplotlib.pyplot as plt

# Simulate speaker embedding and adaptation
sr = 16000
t = np.linspace(0, 0.5, int(sr*0.5))

# Two speakers, same content
speaker_a = np.sin(2*np.pi*180*t)  # lower pitch
speaker_b = np.sin(2*np.pi*280*t)  # higher pitch
content = np.sin(2*np.pi*4*t) * (t < 0.25)  # amplitude modulation (content)

clone_b_to_a = speaker_b * np.abs(content)  # content from B, timbre from... 

plt.figure(figsize=(12, 5))
plt.subplot(311); plt.plot(t, speaker_a * np.abs(content)); plt.title('Speaker A (source)')
plt.subplot(312); plt.plot(t, speaker_b * np.abs(content)); plt.title('Speaker B (target)')
plt.subplot(313); plt.plot(t, clone_b_to_a); plt.title('Clone: B speaking with A-like content')
plt.tight_layout()
plt.show()

print(f"✅ Voice Cloning: extract speaker embedding (few seconds) → synthesize new content")
print(f"Approaches: speaker adaptation, encoder-decoder, in-context learning")
print("Popular: Coqui-AI, OpenVoice, YourTTS, VoiceCraft")`,
    title: 'POC: Voice Cloning'
  },
  '環境音生成': {
    install: '!pip install -q torch numpy matplotlib scipy',
    code: `# Environmental Sound Generation
import numpy as np
import matplotlib.pyplot as plt
from scipy import signal

sr = 22050
dur = 2.0
t = np.linspace(0, dur, int(sr*dur))

# Rain: filtered noise
rain = np.random.randn(len(t))
b, a = signal.butter(4, [200, 2000], btype='band', fs=sr)
rain = signal.filtfilt(b, a, rain) * np.exp(-t)

# Wind: low frequency noise
wind = np.random.randn(len(t))
b_w, a_w = signal.butter(2, 100, btype='low', fs=sr)
wind = signal.filtfilt(b_w, a_w, wind) * (2 + np.sin(2*np.pi*0.5*t))

# Footsteps: impulses
footsteps = np.zeros_like(t)
step_times = np.arange(0.2, dur, 0.4).astype(int) * int(sr/dur)
for s in step_times:
  footsteps[s:s+int(sr*0.05)] = np.exp(-np.arange(int(sr*0.05))/50) * 0.5

mix = rain + wind + footsteps

plt.figure(figsize=(12, 6))
plt.subplot(411); plt.plot(t, rain); plt.title('Rain')
plt.subplot(412); plt.plot(t, wind); plt.title('Wind')
plt.subplot(413); plt.plot(t, footsteps); plt.title('Footsteps')
plt.subplot(414); plt.specgram(mix, NFFT=512, Fs=sr, cmap='inferno')
plt.title('Mixed Soundscape Spectrogram')
plt.xlabel('Time (s)')
plt.tight_layout()
plt.show()

print(f"✅ Environmental sound generation: layer different sound sources")`,
    title: 'POC: Environmental Sound Generation'
  },
  '環境音生成2': {
    install: '!pip install -q torch numpy matplotlib scipy',
    code: `# Environmental Sound Gen 2: Audio Inpainting
import numpy as np
import matplotlib.pyplot as plt

sr = 22050
t = np.linspace(0, 1, sr)

# Original: bird chirp-like
original = np.sin(2*np.pi * 2000 * t) * np.exp(-5*np.abs(t - 0.5)) * (1 + 0.5*np.sin(2*np.pi*20*t))

# Corrupted: missing chunk
corrupted = original.copy()
corrupted[int(sr*0.4):int(sr*0.6)] = 0

# Inpainted: interpolation
inpainted = corrupted.copy()
mask = np.zeros_like(t)
mask[int(sr*0.4):int(sr*0.6)] = 1
# Simple interpolation
gap = inpainted[int(sr*0.4):int(sr*0.6)]
gap_len = len(gap)
inpainted[int(sr*0.4):int(sr*0.6)] = np.linspace(
  corrupted[int(sr*0.4)-1] if int(sr*0.4) > 0 else 0,
  corrupted[int(sr*0.6)] if int(sr*0.6) < len(corrupted) else 0,
  gap_len
) + 0.1 * np.random.randn(gap_len)

plt.figure(figsize=(12, 5))
plt.subplot(311); plt.plot(t, original); plt.title('Original Sound')
plt.subplot(312); plt.plot(t, corrupted); plt.title('Corrupted (missing segment)')
plt.subplot(313); plt.plot(t, inpainted); plt.title('Inpainted')
for ax in [plt.subplot(311), plt.subplot(312), plt.subplot(313)]:
  ax.axvspan(0.4, 0.6, alpha=0.1, color='red')
plt.tight_layout()
plt.show()

print(f"✅ Audio inpainting: fill missing segments with plausible content")`,
    title: 'POC: Environmental Sound Gen 2 (Inpainting)'
  },
  '環境音生成3': {
    install: '!pip install -q torch numpy matplotlib scipy',
    code: `# Environmental Sound Gen 3: Text-to-Sound
import numpy as np
import matplotlib.pyplot as plt

# Simulate text-conditioned sound generation
descriptions = [
  'ocean waves',
  'forest birds',
  'city traffic',
  'rain on roof',
]

# Generate characteristic spectrograms
sr = 22050
fig, axes = plt.subplots(2, 2, figsize=(10, 6))
for ax, desc in zip(axes.flat, descriptions):
  np.random.seed(hash(desc) % 2**32)
  t = np.linspace(0, 2, int(sr*2))
  
  if 'ocean' in desc:
    sound = np.random.randn(len(t))
    b, a = signal.butter(2, 200, btype='low', fs=sr)
    sound = signal.filtfilt(b, a, sound) * (0.5 + 0.5*np.sin(2*np.pi*0.1*t))
  elif 'forest' in desc:
    sound = np.sin(2*np.pi*3000*t) * np.exp(-10*np.abs(t - np.random.uniform(0, 2, 1))) * 0
    for i in range(5):
      pos = np.random.uniform(0.2, 1.8)
      sound += np.sin(2*np.pi*np.random.uniform(2000, 4000)*t) * np.exp(-20*np.abs(t - pos))
  elif 'traffic' in desc:
    sound = np.random.randn(len(t))
    b, a = signal.butter(4, [100, 1000], btype='band', fs=sr)
    sound = signal.filtfilt(b, a, sound) * 0.5
    sound += np.sin(2*np.pi*80*t) * 0.3
  elif 'rain' in desc:
    sound = np.random.randn(len(t))
    b, a = signal.butter(4, [500, 4000], btype='band', fs=sr)
    sound = signal.filtfilt(b, a, sound) * np.exp(-0.3*t)
  
  ax.specgram(sound[:sr], NFFT=512, Fs=sr, cmap='inferno')
  ax.set_title(desc)
  ax.axis('off')

from scipy import signal
plt.tight_layout()
plt.show()

print(f"✅ Text-to-Sound: generate environmental audio from natural language descriptions")
print("Models: AudioLDM, Make-an-Audio, AudioGen")`,
    title: 'POC: Environmental Sound Gen 3 (Text-to-Sound)'
  },
  '画像生成と音声生成の双幅的展開': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Parallel Evolution of Image & Audio Generation
import numpy as np
import matplotlib.pyplot as plt

# Timeline comparison
milestones = {
  'Image Generation': [
    (2014, 'GAN'), (2017, 'StyleGAN'), (2020, 'DDPM'),
    (2021, 'GLIDE'), (2022, 'Stable Diffusion'), (2023, 'DALL-E 3'), (2024, 'Sora')
  ],
  'Audio Generation': [
    (2016, 'WaveNet'), (2019, 'MelGAN'), (2020, 'WaveGrad'),
    (2021, 'AudioLM'), (2022, 'Make-an-Audio'), (2023, 'AudioLDM 2'), (2024, 'VoiceBox')
  ]
}

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 5))
for ax, (domain, items) in zip([ax1, ax2], milestones.items()):
  years, names = zip(*items)
  colors = plt.cm.viridis(np.linspace(0.2, 0.9, len(years)))
  ax.scatter(years, np.ones_like(years) * 0.5, c=colors, s=200, zorder=5)
  for y, n in zip(years, names):
    ax.annotate(n, (y, 0.5), xytext=(0, 20), textcoords='offset points',
                ha='center', fontsize=8, rotation=45)
  ax.set_xlim(2013, 2025)
  ax.set_ylim(0, 1)
  ax.set_yticks([])
  ax.set_title(domain)
  ax.axhline(0.5, color='gray', alpha=0.3)
  ax.grid(axis='x', alpha=0.3)

plt.suptitle('Parallel Evolution: Image vs Audio Generation', y=1.02)
plt.tight_layout()
plt.show()

print(f"✅ Both domains followed same trajectory: GAN→Diffusion→Flow")
print(f"   Audio lags ~2-3 years behind image generation")`,
    title: 'POC: Image vs Audio Evolution'
  },
  '過剰平滑化': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Over-smoothing in Generative Models
import numpy as np
import matplotlib.pyplot as plt

# Simulate: multi-step generation with over-smoothing
n_steps = 10
np.random.seed(42)
ground_truth = np.sin(np.linspace(0, 6*np.pi, 100)) + 0.2 * np.random.randn(100)

# Without over-smoothing: retains detail
sharp = ground_truth.copy()

# With over-smoothing: each step loses high frequencies
smooth = ground_truth.copy()
for i in range(5):
  smooth = np.convolve(smooth, [0.1, 0.8, 0.1], mode='same')

plt.figure(figsize=(12, 5))
plt.plot(ground_truth, 'k-', alpha=0.5, label='Ground Truth')
plt.plot(sharp, 'b-', label='Sharp (no over-smoothing)')
plt.plot(smooth, 'r-', label='Over-smoothed', lw=2)
plt.fill_between(range(len(ground_truth)), smooth, ground_truth, alpha=0.2, color='red')
plt.xlabel('Time Step')
plt.ylabel('Amplitude')
plt.title('Over-smoothing: Loss of High-Frequency Detail')
plt.legend()
plt.grid(alpha=0.3)
plt.show()

# Quantify
sharp_mse = np.mean((ground_truth - sharp)**2)
smooth_mse = np.mean((ground_truth - smooth)**2)

print(f"✅ Over-smoothing: MSE increases from {sharp_mse:.4f} → {smooth_mse:.4f}")
print(f"   Causes: MSE loss averaging, sequential AR models, deep diffusion")
print(f"   Solutions: GAN, adversarial loss, perceptual loss, consistency models")`,
    title: 'POC: Over-smoothing'
  },
  '離散トークン': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Discrete Audio Tokens: Quantization
import numpy as np
import matplotlib.pyplot as plt

# Simulate quantization of continuous audio
sr = 44100
t = np.linspace(0, 0.01, int(sr*0.01))  # 10ms
continuous = np.sin(2*np.pi*1000*t)

# Uniform quantization
n_bits = 4
levels = 2**n_bits
scale = np.max(np.abs(continuous))
quantized = np.round(continuous / scale * (levels//2 - 1)) / (levels//2 - 1) * scale

# Residual
residual = continuous - quantized

plt.figure(figsize=(12, 6))
plt.subplot(311); plt.plot(t, continuous, 'b-', lw=2); plt.title(f'Continuous (float32)')
plt.subplot(312); plt.plot(t, quantized, 'r.-', lw=2); plt.title(f'Quantized ({n_bits}-bit, {levels} levels)')
plt.subplot(313); plt.plot(t, residual, 'gray', lw=1); plt.title(f'Residual error (RMSE={np.std(residual):.4f})')
plt.tight_layout()
plt.show()

# RVQ concept: multi-stage quantization
print(f"✅ Uniform {n_bits}-bit quantization: {levels} levels")
print(f"   RVQ (Residual VQ): quantize residual → multiple codebooks")
print(f"   Used in: EnCodec, SoundStream, DAC, SpeechTokenizer")`,
    title: 'POC: Discrete Tokens'
  },
  'DAC': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# DAC: Descript Audio Codec (Improved RVQGAN)
import numpy as np
import matplotlib.pyplot as plt

# Simulate multi-scale RVQ compression
n_codebooks = 8
bandwidths = np.arange(1, n_codebooks + 1)
quality = 1 - np.exp(-0.5 * bandwidths)  # diminishing returns

plt.figure(figsize=(10, 5))
plt.bar(bandwidths, quality, color='steelblue')
plt.axhline(0.9, color='r', linestyle='--', alpha=0.5, label='Perceptual threshold')
plt.xlabel('Number of RVQ Codebooks')
plt.ylabel('Reconstruction Quality')
plt.title('DAC: Multi-scale Residual VQ (each codebook adds detail)')
plt.xticks(bandwidths)
plt.legend()
plt.grid(axis='y', alpha=0.3)
plt.show()

# Compare codecs
codecs = ['EnCodec (24kHz)', 'SoundStream (16kHz)', 'DAC (44kHz)']
params = ['24kbps, 8 RVQ', '6kbps, 12 RVQ', '8kbps, 9 RVQ']
x = np.arange(len(codecs))
plt.figure(figsize=(8, 4))
plt.bar(x, [24, 6, 8], color=['lightcoral', 'gold', 'steelblue'])
plt.xticks(x, [f'{c}\\n{p}' for c, p in zip(codecs, params)])
plt.ylabel('Bitrate (kbps)')
plt.title('DAC: Higher quality at lower bitrate vs predecessors')
plt.grid(axis='y', alpha=0.3)
plt.show()

print(f"✅ DAC: Improved RVQGAN with multi-scale training")
print(f"   High fidelity at 8kbps, supports 44kHz sampling rate")
print(f"   Uses: VQ-VAE + GAN + perceptual loss + multi-bandit")`,
    title: 'POC: DAC'
  },
  'CAVLS': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# CAVLS: Content Adaptive Variable Length Segmentation
import numpy as np
import matplotlib.pyplot as plt

# Simulate adaptive vs fixed segmentation
sr = 16000
dur = 3.0
t = np.linspace(0, dur, int(sr*dur))

# Audio with varying complexity
audio = np.zeros_like(t)
audio[int(sr*0.0):int(sr*0.8)] = 0.05 * np.random.randn(int(sr*0.8))  # silence/noise
audio[int(sr*0.8):int(sr*2.2)] = np.sin(2*np.pi*300*t[int(sr*0.8):int(sr*2.2)]) * 0.8  # speech
audio[int(sr*2.2):] = np.sin(2*np.pi*600*t[int(sr*2.2):]) * 0.3 + 0.1*np.random.randn(int(sr*0.8))  # complex

# Fixed segmentation (50ms blocks)
fixed_len = int(sr * 0.05)
fixed_segments = []
for i in range(0, len(audio), fixed_len):
  fixed_segments.append(np.std(audio[i:i+fixed_len]))

# Adaptive: larger segments for silence, smaller for complex
adaptive_segments = []
idx = 0
while idx < len(audio):
  complexity = np.std(audio[idx:idx+int(sr*0.05)])
  seg_len = int(sr * (0.1 if complexity < 0.05 else 0.025))
  seg_len = min(seg_len, len(audio) - idx)
  adaptive_segments.append(complexity)
  idx += seg_len

fixed_times = np.arange(len(fixed_segments)) * fixed_len / sr
adaptive_times = np.linspace(0, dur, len(adaptive_segments))

plt.figure(figsize=(12, 5))
plt.subplot(311); plt.plot(t, audio); plt.title('Audio Signal')
plt.ylabel('Amplitude')
plt.subplot(312); plt.stem(fixed_times[::10], fixed_segments[::10]); plt.title(f'Fixed Segmentation ({len(fixed_segments)} segments)')
plt.ylabel('Energy')
plt.subplot(313); plt.stem(adaptive_times, adaptive_segments); plt.title(f'CAVLS: Adaptive ({len(adaptive_segments)} segments)')
plt.xlabel('Time (s)')
plt.ylabel('Energy')
plt.tight_layout()
plt.show()

print(f"✅ CAVLS: Fixed={len(fixed_segments)} segments, Adaptive={len(adaptive_segments)}")
print(f"   Saves {abs(len(adaptive_segments)-len(fixed_segments))} segments ({100*abs(len(adaptive_segments)-len(fixed_segments))/len(fixed_segments):.0f}%)")`,
    title: 'POC: CAVLS'
  },
  'DiT': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Diffusion Transformer (DiT) for Audio
import torch
import torch.nn as nn

# Minimal DiT block
class DiTBlock(nn.Module):
  def __init__(self, dim=64, nhead=4):
    super().__init__()
    self.norm1 = nn.LayerNorm(dim)
    self.attn = nn.MultiheadAttention(dim, nhead, batch_first=True)
    self.norm2 = nn.LayerNorm(dim)
    self.mlp = nn.Sequential(
      nn.Linear(dim, dim*4), nn.GELU(), nn.Linear(dim*4, dim)
    )
    # Adaptive LayerNorm (for timestep conditioning)
    self.adaLN = nn.Sequential(
      nn.SiLU(), nn.Linear(dim, 6*dim)
    )
  
  def forward(self, x, t_emb):
        shift_msa, scale_msa, gate_msa, shift_mlp, scale_mlp, gate_mlp = \
      self.adaLN(t_emb).chunk(6, dim=-1)
    
    # Attention with conditioning
    x_norm = self.norm1(x) * (1 + scale_msa).unsqueeze(1) + shift_msa.unsqueeze(1)
    x = x + gate_msa.unsqueeze(1) * self.attn(x_norm, x_norm, x_norm)[0]
    
    # MLP with conditioning
    x_norm = self.norm2(x) * (1 + scale_mlp).unsqueeze(1) + shift_mlp.unsqueeze(1)
    x = x + gate_mlp.unsqueeze(1) * self.mlp(x_norm)
    return x

# Build tiny DiT
dim = 64
block = DiTBlock(dim)
x = torch.randn(2, 16, dim)
t = torch.randn(2, dim)
out = block(x, t)
print(f"DiT Block: {x.shape} → {out.shape}")
print(f"✅ DiT: Transformer replaces U-Net in diffusion")
print(f"   Scaled to billion params, achieves SOTA (e.g. Stable Diffusion 3)")`,
    title: 'POC: DiT'
  },
  'ConsistencyModel': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Consistency Models: One-step Generation
import numpy as np
import matplotlib.pyplot as plt

# Compare diffusion vs consistency model
n_steps_diffusion = 50
n_steps_consistency = 1

# Simulate generation quality vs steps
steps = np.array([1, 2, 5, 10, 20, 50])
quality = 1 - np.exp(-0.3 * steps)  # diffusion
quality_cm = 0.85 + 0.15 * (1 - np.exp(-0.5 * steps))  # consistency (high quality even at 1 step)

plt.figure(figsize=(10, 5))
plt.plot(steps, quality, 'b-o', label='Diffusion Model', lw=2)
plt.plot(steps, quality_cm, 'r-s', label='Consistency Model', lw=2)
plt.axhline(0.9, color='gray', linestyle='--', alpha=0.5, label='Practical ceiling')
plt.xlabel('Sampling Steps')
plt.ylabel('Generation Quality')
plt.title('Consistency Model: High Quality in 1 Step')
plt.legend()
plt.grid(alpha=0.3)
plt.xscale('log')
plt.show()

print(f"✅ Consistency Model: quality={quality_cm[0]:.2f} at 1 step")
print(f"   vs Diffusion: quality={quality[0]:.2f} at 1 step")
print(f"   Key insight: enforce self-consistency across time → one-step generation")`,
    title: 'POC: Consistency Model'
  },
  'LEAF': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# LEAF: Learnable Audio Frontend
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import matplotlib.pyplot as plt

# Minimal LEAF-inspired frontend
class LeafFrontend(nn.Module):
  def __init__(self, n_filters=40, kernel_size=401):
    super().__init__()
    # Gabor filters (learnable)
    self.freq = nn.Parameter(torch.linspace(80, 7600, n_filters) / 16000)
    self.sigma = nn.Parameter(torch.ones(n_filters) * 0.1)
    self.kernel_size = kernel_size
  
  def forward(self, x):
    B, T = x.shape
    t = torch.arange(-(self.kernel_size//2), self.kernel_size//2 + 1, device=x.device).float()
    # Gabor filterbank
    kernels = []
    for f, s in zip(self.freq, self.sigma):
      gabor = torch.exp(-(t**2) / (2*s**2)) * torch.cos(2*np.pi*f*t)
      kernels.append(gabor)
    kernel = torch.stack(kernels).unsqueeze(1)  # [C, 1, K]
    return F.conv1d(x.unsqueeze(1), kernel, padding=self.kernel_size//2)

# Demo
model = LeafFrontend(20, 201)
audio = torch.randn(2, 16000)
feats = model(audio)
print(f"LEAF Frontend: {audio.shape} → {feats.shape}")
print(f"✅ LEAF replaces Mel filterbank with learnable Gabor filters")
print(f"   End-to-end: learns optimal time-frequency representation for task")`,
    title: 'POC: LEAF'
  },
  'MOS': {
    install: '!pip install -q torch numpy matplotlib scipy',
    code: `# MOS: Mean Opinion Score Evaluation
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Simulate MOS ratings for different systems
systems = ['WaveNet', 'Tacotron2', 'FastSpeech', 'VoiceBox', 'NaturalSpeech 3']
mean_mos = [4.2, 3.8, 3.5, 4.0, 4.5]
std_mos = [0.5, 0.7, 0.6, 0.4, 0.3]

x = np.arange(len(systems))
plt.figure(figsize=(10, 5))
plt.bar(x, mean_mos, yerr=std_mos, capsize=5, color='steelblue', alpha=0.8)
plt.axhline(4.0, color='r', linestyle='--', alpha=0.5, label='MOS=4.0 (TTS ceiling)')
plt.axhline(4.5, color='g', linestyle='--', alpha=0.5, label='MOS=4.5 (human-level)')
plt.xticks(x, systems, rotation=15)
plt.ylabel('Mean Opinion Score (1-5)')
plt.title('MOS: Subjective Quality Assessment')
plt.legend()
plt.grid(axis='y', alpha=0.3)
plt.ylim(0, 5.5)
plt.show()

# Simulate rating distribution
np.random.seed(42)
n_raters = 100
ratings = np.random.normal(4.2, 0.5, n_raters)
ratings = np.clip(ratings, 1, 5)
ci = stats.t.interval(0.95, df=n_raters-1, loc=np.mean(ratings), scale=stats.sem(ratings))

print(f"✅ MOS: {np.mean(ratings):.2f} ± {ci[1]-np.mean(ratings):.2f} (95% CI)")
print(f"   Ceiling: ~4.5 (human speech), good TTS: >4.0")
print(f"   Alternatives: MUSHRA, ABX, CMOS (comparative)")`,
    title: 'POC: MOS'
  },
  'MeanFlow': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# MeanFlow: Flow-based Speech Enhancement
import numpy as np
import matplotlib.pyplot as plt

# Simulate speech enhancement with flow
sr = 16000
t = np.linspace(0, 1, sr)
clean = np.sin(2*np.pi*300*t) * np.exp(-3*t) + 0.5*np.sin(2*np.pi*600*t) * np.exp(-2*t)

# Noisy mixture
noise = 0.3 * np.random.randn(len(t))
noisy = clean + noise

# Flow-based enhancement (simulated: Wiener-like filter)
# Estimate noise floor
noise_floor = np.median(np.abs(np.fft.rfft(noise)))
spec = np.fft.rfft(noisy)
mag = np.abs(spec)
phase = np.angle(spec)
# Soft mask
mask = np.maximum(0, 1 - noise_floor / (mag + 1e-8))
enhanced = np.fft.irfft(mag * mask * np.exp(1j * phase))

plt.figure(figsize=(12, 5))
plt.subplot(311); plt.plot(t, clean); plt.title('Clean Speech')
plt.subplot(312); plt.plot(t, noisy); plt.title(f'Noisy (SNR={10*np.log10(np.var(clean)/np.var(noise)):.1f}dB)')
plt.subplot(313); plt.plot(t, enhanced); plt.title('MeanFlow Enhanced')
plt.tight_layout()
plt.show()

snr_in = 10*np.log10(np.var(clean)/np.var(noise))
snr_out = 10*np.log10(np.var(clean)/np.var(enhanced-clean))
print(f"✅ MeanFlow: SNR {snr_in:.1f}dB → {snr_out:.1f}dB")
print(f"   Normalizing flow maps noisy→clean distribution")`,
    title: 'POC: MeanFlow'
  },
  'Moshi_KAME': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# Moshi / KAME: Full-Duplex Speech Models
import numpy as np
import matplotlib.pyplot as plt

# Simulate Moshi's 7-stream architecture
streams = [
  'Text (user→AI)', 'Text (AI→user)',
  'Audio (user→AI)', 'Audio (AI→user)',
  'Depth 1', 'Depth 2', 'Depth 3'
]
semantic = [1, 1, 1, 1, 0.5, 0.3, 0.1]  # decreasing semantic content

plt.figure(figsize=(10, 5))
colors = ['#e74c3c', '#3498db', '#e74c3c', '#3498db', '#95a5a6', '#95a5a6', '#95a5a6']
plt.barh(streams, semantic, color=colors, alpha=0.8)
plt.axvline(0.5, color='gray', linestyle='--', alpha=0.5, label='Semantic boundary')
plt.xlabel('Semantic Content')
plt.title('Moshi: 7-Stream Architecture (4 text+coarse + 3 fine audio)')
plt.legend()
plt.grid(axis='x', alpha=0.3)
plt.show()

# KAME: 4th oracle stream
labels = ['User Audio', 'User Text', 'AI Audio', 'AI Text', '(Oracle)']
widths = [1.0, 0.6, 1.0, 0.6, 0.8]
fig, ax = plt.subplots(figsize=(10, 3))
for i, (l, w) in enumerate(zip(labels, widths)):
  ax.barh(0, w, left=sum(widths[:i]), height=0.4, label=l, alpha=0.8)
ax.set_yticks([])
ax.set_xlabel('Relative Importance')
ax.set_title('KAME: 4th Oracle Stream (ICASSP 2026, Sakana AI)')
ax.legend(loc='upper right', fontsize=8)
plt.show()

print(f"✅ Moshi: 7-stream full-duplex speech-text model (Kyutai)")
print(f"✅ KAME: adds 4th oracle stream for better conversation dynamics")
print(f"   Apache 2.0 licensed")`,
    title: 'POC: Moshi / KAME'
  },
  'NeuralSVB': {
    install: '!pip install -q torch numpy matplotlib',
    code: `# NeuralSVB: Singing Voice Beautification
import numpy as np
import matplotlib.pyplot as plt

# Simulate pitch correction (autotune-like)
sr = 16000
t = np.linspace(0, 1, sr)
# Slightly off-pitch singing
f0_target = 440  # A4
f0_off = 440 + 30 * np.sin(2*np.pi*3*t)  # wobble ±30 cents
off_pitch = np.sin(2*np.pi*f0_off * t) * np.exp(-2*t)
corrected = np.sin(2*np.pi*f0_target * t) * np.exp(-2*t)

plt.figure(figsize=(12, 5))
plt.subplot(311); plt.specgram(off_pitch, NFFT=1024, Fs=sr, cmap='inferno')
plt.title('Original: Off-pitch singing (wobble)')
plt.ylabel('Freq (Hz)')
plt.ylim(0, 2000)
plt.subplot(312); plt.specgram(corrected, NFFT=1024, Fs=sr, cmap='inferno')
plt.title('NeuralSVB: Pitch-corrected')
plt.ylabel('Freq (Hz)')
plt.ylim(0, 2000)
plt.subplot(313)
f0_off_hz = 440 + 30 * np.sin(2*np.pi*3*t)
f0_corrected = np.ones_like(t) * 440
plt.plot(t, f0_off_hz, 'r-', label='Original F0', alpha=0.7)
plt.plot(t, f0_corrected, 'b--', label='Corrected F0', lw=2)
plt.ylabel('Pitch (Hz)')
plt.xlabel('Time (s)')
plt.legend()
plt.tight_layout()
plt.show()

print(f"✅ NeuralSVB: corrects pitch, timbre, and expression of singing voice")
print(f"   From Zhejiang University (MoonInTheRiver)")
print(f"   Extends DiffSinger with neural processing")`,
    title: 'POC: NeuralSVB'
  },
  'Prosody': {
    install: '!pip install -q torch numpy matplotlib librosa',
    code: `# Prosody: Rhythm, Pitch, and Energy
import numpy as np
import matplotlib.pyplot as plt

# Simulate prosody features
sr = 100  # analyze at 10ms frame rate
dur = 3.0
t = np.linspace(0, dur, int(sr*dur))

# Pitch contour (F0)
f0 = 200 + 50 * np.sin(2*np.pi*0.5*t) + 30 * np.sin(2*np.pi*2*t)
f0[t < 0.5] = 180 + 20 * np.random.randn(np.sum(t < 0.5))  # monotone start

# Energy contour
energy = 0.5 + 0.5 * np.sin(2*np.pi*0.8*t)**2

# Duration: simulates phoneme durations
phonemes = ['s', 'i:', 'k', 'o:', 'd', 'e', 's', 'u']
durs = [0.15, 0.2, 0.1, 0.25, 0.1, 0.2, 0.15, 0.2]
phoneme_times = np.cumsum([0] + durs)

plt.figure(figsize=(12, 6))
plt.subplot(311); plt.plot(t, f0, 'b-', lw=2); plt.title('Pitch (F0) Contour')
plt.ylabel('Frequency (Hz)')
plt.grid(alpha=0.3)
plt.subplot(312); plt.plot(t, energy, 'r-', lw=2); plt.title('Energy/Intensity')
plt.ylabel('Energy')
plt.grid(alpha=0.3)
plt.subplot(313)
for i, (p, pt) in enumerate(zip(phonemes, phoneme_times)):
  plt.axvspan(pt, pt + durs[i], alpha=0.3, color=plt.cm.tab10(i % 10))
  plt.text(pt + durs[i]/2, 0.5, p, ha='center', va='center')
plt.xlim(0, phoneme_times[-1])
plt.ylim(0, 1)
plt.xlabel('Time (s)')
plt.title(f'Duration: {" | ".join(phonemes)}')
plt.grid(alpha=0.3)

plt.tight_layout()
plt.show()

print(f"✅ Prosody = Pitch (melody) + Energy (stress) + Duration (rhythm)")
print(f"   Key for natural TTS: flat prosody → robotic, varied → human-like")`,
    title: 'POC: Prosody'
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

    // Skip existing POCs (unless --force)
    if (existsSync(colabPath)) {
      if (!FORCE) {
        console.log(`⏭️  ${colabName} (exists, use --force to regenerate)`);
        continue;
      }
      console.log(`♻️  ${colabName} (force regenerate)`);
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
