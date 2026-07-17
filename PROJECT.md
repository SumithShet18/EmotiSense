# EmotiSense — Project Reference

Complete architecture, data flow, and file inventory for the EmotiSense multimodal emotion detection system.

## Directory Structure

```
Mental health/
├── backend/
│   ├── app.py                  # FastAPI entry point (7 endpoints)
│   ├── config.py               # MODEL_PATH, EMOTION_LABELS, device, env vars
│   ├── model_loader.py         # CrossAttentionFusion, EmotiSenseModel, load_model()
│   ├── full_model.py           # EmotiSenseFullModel (BERT + HuBERT encoders + head)
│   ├── inference.py            # predict_emotion() pipeline orchestrator
│   ├── xai.py                  # explain_prediction(), Integrated Gradients, token attention
│   ├── xai_schemas.py          # Pydantic: ModalityGate, InlineExplanation, XAIResponse
│   ├── narration.py            # generate_reasoning() — NL explanation
│   ├── attribution.py          # Attention rollout, IG, faithful attribution
│   ├── transcription.py        # faster-whisper base, beam_size=3, VAD filter
│   ├── audio_features.py       # librosa: energy, pitch, speech rate, pauses, spectral
│   ├── database.py             # SQLite + Supabase dual backend
│   ├── supabase_client.py      # Supabase CRUD + storage bucket
│   ├── performance_profiler.py # ProfileStage (latency, CPU, memory, energy)
│   └── requirements.txt
├── frontend/src/
│   ├── pages/
│   │   ├── HomePage.tsx         # Landing / hero
│   │   ├── AnalyzePage.tsx      # Audio recording + upload → prediction
│   │   ├── ExplainPage.tsx      # XAI: token attention, modality gauge, audio features, IG
│   │   ├── HistoryPage.tsx      # Dashboard + paginated history table
│   │   ├── ArchitecturePage.tsx # PipelineWalkthrough interactive diagram
│   │   ├── PerformancePage.tsx  # Model comparison, per-prediction metrics
│   │   ├── FinalReportPage.tsx  # 7-section printable PDF report
│   │   └── AboutPage.tsx        # Technology descriptions
│   ├── components/
│   │   ├── PipelineWalkthrough.tsx    # Dual-track pipeline explorer
│   │   ├── ResultCard.tsx            # Prediction display with audio player
│   │   ├── ModelComparisonTable.tsx   # 4-arch accuracy/F1 table
│   │   ├── ConfusionMatrixGrid.tsx    # Selectable confusion matrices
│   │   ├── HistoryTable.tsx          # Paginated search/filter table
│   │   ├── DashboardSummaryCards.tsx  # 4 summary stat cards
│   │   ├── EmotionDistributionChart.tsx # Donut chart of emotion distribution
│   │   ├── OverallPerformanceChart.tsx # Grouped bar chart
│   │   ├── F1BreakdownChart.tsx       # Per-class F1 bars
│   │   └── ... (5 more components)
│   ├── types/index.ts          # All TypeScript interfaces
│   ├── api/client.ts           # HTTP client (predict, explain, history, etc.)
│   └── data/
│       ├── pipelineStages.ts   # 12-stage pipeline definitions
│       └── modelComparison.ts  # 4-model validation metrics + confusion matrices
├── models/
│   └── finetuned-final/
│       └── mindlens_finetuned.pth   # Production checkpoint (~830MB, not in git)
├── database/
│   └── emotisense.db           # SQLite file (local fallback)
├── updates/                    # Training code (source of truth)
│   ├── train_finetune.py       # Partial fine-tuning script
│   ├── model_loader.py         # Original (no modality contribution)
│   ├── full_model.py           # Original (no output_attentions)
│   ├── inference.py            # Original (6-tuple return)
│   ├── config.py               # Training-only config
│   └── audio_text_preprocessing.py  # Shared preprocessing source of truth
└── scripts/
    ├── migration.sql           # Supabase schema creation
    └── migrate_xai_v2.sql      # Add ig_attributions column + 5-class merge
```

## Architecture

### Input: Audio ONLY (single entry point)
No text input field. Audio file/recording → everything derived from it.

### Pipeline (11 stages)
```
Audio Input
  ├──→ Whisper Transcription → MentalBERT Tokenizer → MentalBERT Encoder
  │     (faster-whisper base)    (bert-base-uncased)   (last 3 of 12 layers fine-tuned)
  │                                                           768-dim embedding
  └──→ VAD Silence Trim → Normalize → HuBERT Encoder
        (30dB threshold)     (μ=0 σ=1)   (last 3 of 12 layers fine-tuned, CNN frozen)
                                              768-dim embedding
                      ↓
              Per-Modality LayerNorm (independent)
                      ↓
              Cross-Modal Attention (text=query, audio=key/value, 8 heads)
                      ↓
              Learned Gated Residual Fusion
                gate = sigmoid(Linear([text; attended]))  → [0,1] per dim
                fused = text + gate × attended
                modality_contribution = gate.mean()  ← per-sample learned split
                      ↓
              Classifier: Linear(768→256)→ReLU→Dropout(0.3)→Linear(256→5)→Softmax
                      ↓
              5 emotions: angry, happy, sad, neutral, frustrated
```

### Models
| Component | Base Model | Dim | Layers Fine-Tuned |
|-----------|-----------|-----|--------------------|
| Text encoder | bert-base-uncased | 768 | last 3 of 12 |
| Audio encoder | facebook/hubert-base-ls960 | 768 | last 3 of 12 |
| Fusion | Cross-attention + gated residual | 768 | — |
| Total trainable | ~54M / ~205M (26%) | | |

## Modality Contribution

Computed in `backend/model_loader.py` `CrossAttentionFusion.forward()`:

```python
text_mag = text_features.norm(dim=-1)        # pure BERT embedding
audio_mag = attended.norm(dim=-1)            # HuBERT via cross-attention
total_mag = text_mag + audio_mag
text_pct = text_mag / total_mag * 100
audio_pct = audio_mag / total_mag * 100
```

Both `text_features` and `attended` pass through independent LayerNorms, so their scales are directly comparable. Single-modality fallbacks: text-only = 100/0, audio-only = 0/100.

## Training Details

- **Dataset**: IEMOCAP (7,380 utterances, 5 sessions)
- **Split**: Session 4 = val, Session 5 = test, rest = train
- **Merge**: "excited" → "happy" (standard IEMOCAP 5-class protocol)
- **Optimizer**: AdamW (encoders 2e-5, head 1e-3)
- **Batch**: 8, **Epochs**: 15, **Early stopping**: patience 6
- **Loss**: Class-weighted CrossEntropy
- **Scheduler**: ReduceLROnPlateau (factor=0.5, patience=3)
- **Mixed precision**: AMP (CUDA)
- **Gradient clipping**: max_norm=1.0

### Test Performance
| Metric | Value |
|--------|-------|
| Accuracy | 65.17% |
| Macro F1 | 64.90% |

Ablation: Text-only 56.54% / Audio-only 50.37% / Fusion head-only 61.78%

## Database Schema

### SQLite (`database/emotisense.db`)
- **emotion_logs**: id (INTEGER PK), timestamp, text_input, audio_path, emotion, confidence, probabilities (JSON)
- **performance_logs**: id, prediction_id, component, latency_ms, memory_mb, cpu_usage, energy_joules
- **xai_results**: id, prediction_id, reasoning, token_importances, modality_contributions, audio_features, uncertainty, ig_attributions

### Supabase (optional)
- **emotion_logs**: UUID id, transcript, emotion, confidence, probabilities (JSONB), audio_url
- **explanations**: UUID id, prediction_id, reasoning, all JSONB fields
- Storage bucket: audio-files

## Frontend Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | HomePage | Landing, hero, feature grid |
| `/analyze` | AnalyzePage | Record/upload audio → predict |
| `/history` | HistoryPage | Dashboard + paginated table |
| `/explain` | ExplainPage | Token attention, modality gauge, audio features, IG |
| `/architecture` | ArchitecturePage | PipelineWalkthrough interactive diagram |
| `/performance` | PerformancePage | Model comparison charts + per-prediction metrics |
| `/final-report` | FinalReportPage | 7-section printable PDF report |
| `/about` | AboutPage | Technology descriptions |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/predict` | FormData (audio or text) → emotion + XAI + performance |
| GET | `/last-result` | Last prediction from memory |
| POST | `/explain` | Compute Integrated Gradients faithful attribution |
| GET | `/history` | Paginated history with search/filter |
| GET | `/prediction/{id}` | Single prediction detail |
| GET | `/performance` | Performance logs |
| GET | `/health` | Health check |

## Key Design Decisions

1. **Audio-only input** — No text entry field. Whisper transcribes speech. Eliminates redundant text pathway.
2. **Partial fine-tuning** — Last 3 of 12 BERT/HuBERT layers unfrozen. Prevents overfitting on small IEMOCAP dataset.
3. **Mean pooling** (not CLS) — For both BERT and HuBERT. CLS token underperformed in testing.
4. **Residual fusion** — `fused = text + gate × attended` preserves strong modality (text) while allowing audio to contribute proportionally.
5. **Modality contribution via L2 norm** — Compares `text_features` vs cross-attention output `attended` (both LayerNorm'd, same scale).
6. **Independent per-modality LayerNorm** — BERT and HuBERT outputs live on different scales; normalizing before fusion is essential.
7. **No `text_input` remnants** — The codebase has been cleaned to remove text as a separate input modality.

## Running

```bash
# Backend
cd backend
uvicorn app:app --host 0.0.0.0 --port 8742

# Frontend
cd frontend
npm run dev    # → http://localhost:5173
```

Set `EMOTISENSE_DEMO=true` in `backend/.env` to run without the model checkpoint.
