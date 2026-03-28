require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Anthropic client ──────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: '*', // Lock this down to your app's bundle ID in production if needed
  methods: ['GET', 'POST'],
}));

// ── Simple API key auth (stops randos from using your endpoint) ───────────────
function requireAppKey(req, res, next) {
  const key = req.headers['x-resist-key'];
  if (!process.env.RESIST_APP_KEY || key === process.env.RESIST_APP_KEY) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'resist-backend', version: '1.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Privacy Policy ────────────────────────────────────────────────────────────
app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Resist — Privacy Policy</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;padding:40px 24px;color:#1a1a1a;line-height:1.7}h1{font-size:28px;font-weight:700;margin-bottom:4px}h2{font-size:18px;font-weight:600;margin-top:32px;margin-bottom:8px}p{margin:0 0 16px;color:#333}.date{color:#888;font-size:14px;margin-bottom:32px}a{color:#c0392b}</style></head><body>
<h1>Privacy Policy</h1><p class="date">Last updated: March 28, 2026</p>
<p>Resist: Break the Scroll is committed to protecting your privacy.</p>
<h2>Information We Collect</h2>
<p>All usage data — tracked apps, challenge history, focus scores, badges, streaks — is stored locally on your device only. This data never leaves your device and is not transmitted to our servers.</p>
<p>When generating daily challenges, your app sends anonymous requests to our backend. These requests contain no personal information.</p>
<h2>Information We Do Not Collect</h2>
<p>We do not collect your name, email, location, device ID, advertising ID, browsing history, health data, or payment information. Payments are handled entirely by Apple.</p>
<h2>Third-Party Services</h2>
<p>Purchases are processed by Apple App Store. Our backend uses the Anthropic API to generate challenge content — no personal data is included in these requests. Our backend is hosted on Railway.</p>
<h2>Children's Privacy</h2>
<p>Resist is rated 13+ on the App Store. We do not knowingly collect any information from children under 13.</p>
<h2>Contact</h2>
<p><a href="mailto:resist@justinpersicketti.com">resist@justinpersicketti.com</a></p>
<p style="margin-top:48px;color:#888;font-size:13px">© 2026 Justin Persicketti. All rights reserved.</p>
</body></html>`);
});

// ── Terms of Use ──────────────────────────────────────────────────────────────
app.get('/terms', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Resist — Terms of Use</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;padding:40px 24px;color:#1a1a1a;line-height:1.7}h1{font-size:28px;font-weight:700;margin-bottom:4px}h2{font-size:18px;font-weight:600;margin-top:32px;margin-bottom:8px}p{margin:0 0 16px;color:#333}.date{color:#888;font-size:14px;margin-bottom:32px}a{color:#c0392b}</style></head><body>
<h1>Terms of Use</h1><p class="date">Last updated: March 28, 2026</p>
<p>By downloading or using Resist: Break the Scroll, you agree to these Terms of Use.</p>
<h2>Use of the App</h2>
<p>Resist is for personal, non-commercial use only. You may not reverse engineer, copy, or redistribute the app.</p>
<h2>Purchase and Refunds</h2>
<p>Resist is a one-time purchase through the Apple App Store. Refund requests must be made through Apple directly.</p>
<h2>Disclaimer</h2>
<p>Resist is designed to help build healthier digital habits. We make no guarantee of specific results. Resist is not a medical device and does not treat addiction disorders. Consult a healthcare professional if needed.</p>
<h2>Limitation of Liability</h2>
<p>To the maximum extent permitted by law, Resist and its creator shall not be liable for any indirect or consequential damages from use of the app.</p>
<h2>Contact</h2>
<p><a href="mailto:resist@justinpersicketti.com">resist@justinpersicketti.com</a></p>
<p style="margin-top:48px;color:#888;font-size:13px">© 2026 Justin Persicketti. All rights reserved.</p>
</body></html>`);
});
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Main proxy endpoint ───────────────────────────────────────────────────────
// Mirrors the Anthropic /v1/messages API so the app code barely changes
app.post('/v1/messages', requireAppKey, async (req, res) => {
  try {
    const { model, max_tokens, system, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const response = await anthropic.messages.create({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 1000,
      system,
      messages,
    });

    res.json(response);
  } catch (err) {
    console.error('[/v1/messages] Error:', err.message);
    res.status(500).json({
      error: 'Generation failed',
      message: err.message,
    });
  }
});

// ── Convenience endpoints for each content type ───────────────────────────────

// Daily content bundle — generates everything at once
app.post('/content/daily', requireAppKey, async (req, res) => {
  const { isPremium = false } = req.body;
  const difficulty = isPremium ? 'hard' : 'medium';
  const counts = isPremium
    ? { trivia: 8, math: 6, sequence: 4, mindfulness: 6, quotes: 5 }
    : { trivia: 4, math: 3, sequence: 2, mindfulness: 3, quotes: 3 };

  try {
    const [trivia, math, sequence, mindfulness, quotes] = await Promise.all([
      generateContent(triviaPrompt(counts.trivia, difficulty)),
      generateContent(mathPrompt(counts.math, difficulty)),
      generateContent(sequencePrompt(counts.sequence, difficulty)),
      generateContent(mindfulnessPrompt(counts.mindfulness)),
      generateContent(quotesPrompt(counts.quotes)),
    ]);

    res.json({
      date: new Date().toISOString().split('T')[0],
      generatedAt: Date.now(),
      trivia,
      math,
      sequence,
      mindfulness,
      quotes,
    });
  } catch (err) {
    console.error('[/content/daily] Error:', err.message);
    res.status(500).json({ error: 'Content generation failed', message: err.message });
  }
});

// Single live trivia question
app.post('/content/trivia', requireAppKey, async (req, res) => {
  const { difficulty = 'medium', count = 1 } = req.body;
  try {
    const result = await generateContent(triviaPrompt(count, difficulty));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single live math puzzle
app.post('/content/math', requireAppKey, async (req, res) => {
  const { difficulty = 'medium', count = 1 } = req.body;
  try {
    const result = await generateContent(mathPrompt(count, difficulty));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single mindfulness tip
app.post('/content/mindfulness', requireAppKey, async (req, res) => {
  const { count = 1 } = req.body;
  try {
    const result = await generateContent(mindfulnessPrompt(count));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Prompt builders ───────────────────────────────────────────────────────────

function triviaPrompt(count, difficulty) {
  return {
    system: 'You are a content generator for Friction, a social media addiction app. Return ONLY a valid JSON array. No preamble, no markdown.',
    user: `Generate ${count} trivia questions about social media psychology, screen time, digital wellness, attention, habits, or dopamine.
Difficulty: ${difficulty}
Return JSON array:
[{
  "question": "string",
  "options": ["string","string","string","string"],
  "correctIndex": 0,
  "explanation": "1-2 sentences",
  "difficulty": "${difficulty}",
  "category": "psychology|neuroscience|habits|statistics|wellness"
}]`,
  };
}

function mathPrompt(count, difficulty) {
  const types = {
    easy: 'multiplication tables, fill-in-the-blank addition/subtraction, doubling, halving, simple squares, simple division',
    medium: 'two-step problems like (a×b)+c, percentages of numbers, missing factors, squares minus values, triple multiplication, reverse percentages, consecutive number sums, powers of 2',
    hard: 'BODMAS multi-step, percentage increases/decreases, cubes, compound squares like (a+b)², nth term of sequences, next prime number, difference of squares, large mental multiplication, division chains',
  };
  return {
    system: 'You generate creative math puzzles. Be varied — never just basic addition. Return ONLY a valid JSON array. No markdown.',
    user: `Generate ${count} math puzzles at ${difficulty} level.
Puzzle types to draw from: ${types[difficulty]}
Be creative and varied — no two puzzles should be the same type.
Return JSON array:
[{
  "question": "the puzzle as a string e.g. '(7 × 8) + 15 = ?'",
  "answer": 71,
  "options": [71, 64, 78, 56],
  "difficulty": "${difficulty}",
  "hint": "a brief mental math strategy for this specific puzzle"
}]
Rules: answer must be in options. Wrong options must be plausible (close to correct answer). All answers must be positive integers.`,
  };
}

function sequencePrompt(count, difficulty) {
  const complexities = {
    easy: 'simple +2, +3, ×2 patterns',
    medium: 'Fibonacci-like, alternating ops, or square numbers',
    hard: 'compound rules, prime sequences, or multiply-then-add',
  };
  return {
    system: 'You generate number sequence puzzles. Return ONLY a valid JSON array. No markdown.',
    user: `Generate ${count} sequence puzzles with one missing number. Complexity: ${complexities[difficulty]}.
Return JSON array:
[{
  "sequence": [2, 4, 8, 0, 32],
  "missingIndex": 3,
  "answer": 16,
  "rule": "Each number doubles",
  "difficulty": "${difficulty}"
}]
Use 0 to mark the missing position.`,
  };
}

function mindfulnessPrompt(count) {
  return {
    system: 'You are a mindfulness coach writing for a social media addiction app. Be warm, practical, non-preachy. Return ONLY a valid JSON array.',
    user: `Generate ${count} mindfulness micro-exercises for someone who just caught themselves about to mindlessly open a social media app.
Each should take under 3 minutes and be doable right now.
Return JSON array:
[{
  "title": "short action-oriented title",
  "body": "2-3 sentences: what to do and why it helps",
  "duration": "e.g. '30 seconds'",
  "category": "breathing|grounding|reflection|movement"
}]`,
  };
}

function quotesPrompt(count) {
  return {
    system: 'You generate motivational content for a digital wellness app. Return ONLY a valid JSON array. No markdown.',
    user: `Generate ${count} quotes about attention, focus, habits, presence, or resisting distraction.
Mix real attributed quotes with original ones (use "Unknown" for original).
Return JSON array:
[{
  "quote": "the quote",
  "author": "Author Name",
  "context": "one sentence on why this relates to breaking phone habits"
}]`,
  };
}

// ── Shared Claude caller ──────────────────────────────────────────────────────

async function generateContent({ system, user }) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const raw = message.content
    .map((b) => b.text || '')
    .join('')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  return JSON.parse(raw);
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Friction backend running on port ${PORT}`);
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ MISSING'}`);
  console.log(`   RESIST_APP_KEY:  ${process.env.RESIST_APP_KEY ? '✓ set' : '⚠ not set (open access)'}`);
});
