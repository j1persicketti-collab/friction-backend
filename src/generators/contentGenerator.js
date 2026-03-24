const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Prompts ──────────────────────────────────────────────────────────────────

const FREE_PROMPT = `You are the content engine for "Friction" — an app that intercepts social media addiction with challenges and mindfulness content.

Generate today's FREE content bundle. Return ONLY valid JSON, no markdown, no explanation.

{
  "date": "YYYY-MM-DD",
  "tier": "free",
  "trivia": [
    {
      "id": "t1",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct (1-2 sentences)",
      "category": "digital_wellness"
    }
  ],
  "math": [
    {
      "id": "m1",
      "question": "e.g. 47 + 28 = ?",
      "answer": 75,
      "difficulty": "easy",
      "wrongOptions": [73, 76, 69]
    }
  ],
  "sequence": [
    {
      "id": "s1",
      "type": "number_order",
      "instruction": "Tap 1 → 9 in order",
      "size": 9,
      "difficulty": "easy"
    }
  ],
  "mindfulness": [
    {
      "id": "mind1",
      "tip": "A practical, specific mindfulness tip (2-3 sentences). Not generic. Grounded.",
      "category": "breathing",
      "durationSeconds": 60
    }
  ],
  "motivation": [
    {
      "id": "mot1",
      "quote": "An original motivational line about attention, focus, or resisting distraction. NOT a famous quote. Write something fresh.",
      "theme": "focus"
    }
  ]
}

Rules:
- Generate 4 trivia questions, 4 math puzzles (difficulty: easy/easy/medium/medium), 1 sequence, 3 mindfulness tips, 3 motivational lines
- Trivia must relate to: digital wellness, attention science, habit formation, screen time research, or interesting general knowledge
- Math: easy = single digit multiplication or 2-digit addition. medium = 2-digit multiplication or 3-digit addition
- Mindfulness tips must be actionable and specific, NOT generic ("take a deep breath" is too generic — instead: "Place one hand on your chest and one on your belly. Breathe so only the belly hand moves. Do this 4 times.")
- Motivational quotes must feel original and slightly edgy, not saccharine. Friction's tone is honest and a little confrontational.
- Today's date: ${new Date().toISOString().split('T')[0]}`;

const PREMIUM_PROMPT = `You are the content engine for "Friction" — an app that intercepts social media addiction.

Generate today's PREMIUM content bundle. This is for paying users who want harder challenges and deeper content. Return ONLY valid JSON, no markdown.

{
  "date": "YYYY-MM-DD",
  "tier": "premium",
  "trivia": [
    {
      "id": "pt1",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Detailed explanation (2-3 sentences with an interesting fact)",
      "category": "neuroscience",
      "difficulty": "hard"
    }
  ],
  "math": [
    {
      "id": "pm1",
      "question": "e.g. 17 × 23 = ?",
      "answer": 391,
      "difficulty": "hard",
      "wrongOptions": [389, 394, 381]
    }
  ],
  "sequence": [
    {
      "id": "ps1",
      "type": "pattern",
      "instruction": "...",
      "pattern": [2, 4, 8, 16, "?"],
      "answer": 32,
      "wrongOptions": [28, 30, 34],
      "difficulty": "hard"
    }
  ],
  "mindfulness": [
    {
      "id": "pmind1",
      "tip": "A deeper, science-backed mindfulness practice. 3-4 sentences.",
      "category": "body_scan",
      "durationSeconds": 120,
      "science": "One sentence citing the research behind this technique"
    }
  ],
  "motivation": [
    {
      "id": "pmot1",
      "quote": "A sharper, more philosophical line about attention, consciousness, or the cost of distraction.",
      "theme": "philosophy",
      "context": "1 sentence of context about why this matters"
    }
  ]
}

Rules:
- Generate 6 trivia, 6 math puzzles (hard: 2-3 digit multiplication, percentage calculations, mental algebra), 3 sequence/pattern challenges, 4 mindfulness tips, 4 motivational lines
- Trivia: harder questions covering neuroscience, behavioral economics, tech ethics, attention research
- Pattern sequences: mathematical patterns, Fibonacci variants, visual logic
- Mindfulness: evidence-based techniques like body scan, 4-7-8 breathing, open monitoring, loving-kindness
- Tone: intelligent, slightly philosophical, treats the user as a thoughtful adult
- Today's date: ${new Date().toISOString().split('T')[0]}`;

// ─── Generator ────────────────────────────────────────────────────────────────

async function generateContentBundle(tier = 'free') {
  const prompt = tier === 'premium' ? PREMIUM_PROMPT : FREE_PROMPT;

  console.log(`[generator] Generating ${tier} content bundle...`);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text;

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const bundle = JSON.parse(cleaned);
  console.log(`[generator] ${tier} bundle generated. Items: trivia=${bundle.trivia?.length}, math=${bundle.math?.length}, mindfulness=${bundle.mindfulness?.length}`);

  return bundle;
}

// ─── Live fallback generator (single item, fast) ──────────────────────────────

async function generateLiveItem(type, tier = 'free') {
  const prompts = {
    trivia: `Generate ONE trivia question about digital wellness, attention science, or habit formation for the Friction app. Return ONLY JSON:
{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","category":"digital_wellness"}`,

    math: `Generate ONE ${tier === 'premium' ? 'hard (2-3 digit multiplication)' : 'medium (2-digit multiplication or 3-digit addition)'} math puzzle. Return ONLY JSON:
{"question":"47 + 28 = ?","answer":75,"difficulty":"medium","wrongOptions":[73,76,69]}`,

    mindfulness: `Generate ONE ${tier === 'premium' ? 'science-backed, detailed' : 'practical, specific'} mindfulness tip for someone who just tried to open a social media app. 2-3 sentences, actionable. Return ONLY JSON:
{"tip":"...","category":"breathing","durationSeconds":60}`,

    motivation: `Generate ONE original motivational line about resisting digital distraction. Tone: honest, slightly confrontational, NOT cheesy. Return ONLY JSON:
{"quote":"...","theme":"focus"}`,
  };

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompts[type] }],
  });

  const raw = message.content[0].text;
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── Save to disk ─────────────────────────────────────────────────────────────

function saveBundle(bundle, tier) {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const filename = path.join(dataDir, `${tier}-${bundle.date}.json`);
  fs.writeFileSync(filename, JSON.stringify(bundle, null, 2));

  // Also write as "latest" for quick access
  const latestFile = path.join(dataDir, `${tier}-latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(bundle, null, 2));

  console.log(`[generator] Saved to ${filename}`);
  return filename;
}

function loadLatest(tier = 'free') {
  const latestFile = path.join(__dirname, `../../data/${tier}-latest.json`);
  if (!fs.existsSync(latestFile)) return null;
  return JSON.parse(fs.readFileSync(latestFile, 'utf8'));
}

module.exports = { generateContentBundle, generateLiveItem, saveBundle, loadLatest };
