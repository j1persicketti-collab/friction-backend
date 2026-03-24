const express = require('express');
const router = express.Router();
const { generateLiveItem, loadLatest } = require('../generators/contentGenerator');

// ─── GET /content/daily ────────────────────────────────────────────────────────
// Returns the full daily bundle for the user's tier
// Query: ?tier=free|premium
router.get('/daily', (req, res) => {
  const tier = req.query.tier === 'premium' ? 'premium' : 'free';
  const bundle = loadLatest(tier);

  if (!bundle) {
    return res.status(503).json({
      error: 'Content not yet generated for today. Try again shortly.',
      fallback: true,
    });
  }

  // For free users requesting premium, strip it down
  if (tier === 'premium' && req.query.tier !== 'premium') {
    return res.status(403).json({ error: 'Premium content requires purchase.' });
  }

  res.json({
    success: true,
    date: bundle.date,
    tier: bundle.tier,
    content: bundle,
  });
});

// ─── GET /content/live ─────────────────────────────────────────────────────────
// Generate a single item live (fallback when daily cache is stale/missing)
// Query: ?type=trivia|math|mindfulness|motivation&tier=free|premium
router.get('/live', async (req, res) => {
  const type = req.query.type || 'trivia';
  const tier = req.query.tier === 'premium' ? 'premium' : 'free';

  const validTypes = ['trivia', 'math', 'mindfulness', 'motivation'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const item = await generateLiveItem(type, tier);
    res.json({ success: true, type, tier, item });
  } catch (err) {
    console.error('[/live] Generation error:', err.message);
    res.status(500).json({
      error: 'Live generation failed. Use fallback content.',
      fallback: true,
    });
  }
});

// ─── GET /content/mindfulness ─────────────────────────────────────────────────
// Quick endpoint just for mindfulness tips (most commonly needed)
router.get('/mindfulness', async (req, res) => {
  const tier = req.query.tier === 'premium' ? 'premium' : 'free';

  // Try daily cache first
  const bundle = loadLatest(tier);
  if (bundle?.mindfulness?.length) {
    const tips = bundle.mindfulness;
    const tip = tips[Math.floor(Math.random() * tips.length)];
    return res.json({ success: true, source: 'daily', tip });
  }

  // Fall back to live generation
  try {
    const tip = await generateLiveItem('mindfulness', tier);
    res.json({ success: true, source: 'live', tip });
  } catch {
    res.status(500).json({ error: 'Could not load mindfulness content.' });
  }
});

// ─── GET /content/motivation ─────────────────────────────────────────────────
// Quick endpoint for today's motivational quote
router.get('/motivation', async (req, res) => {
  const tier = req.query.tier === 'premium' ? 'premium' : 'free';

  const bundle = loadLatest(tier);
  if (bundle?.motivation?.length) {
    const items = bundle.motivation;
    const item = items[Math.floor(Math.random() * items.length)];
    return res.json({ success: true, source: 'daily', item });
  }

  try {
    const item = await generateLiveItem('motivation', tier);
    res.json({ success: true, source: 'live', item });
  } catch {
    res.status(500).json({ error: 'Could not load motivation content.' });
  }
});

// ─── GET /content/status ──────────────────────────────────────────────────────
// Health check — tells the app if today's content is ready
router.get('/status', (req, res) => {
  const freeBundle = loadLatest('free');
  const premiumBundle = loadLatest('premium');
  const today = new Date().toISOString().split('T')[0];

  res.json({
    today,
    free: {
      ready: freeBundle?.date === today,
      date: freeBundle?.date || null,
      items: freeBundle ? {
        trivia: freeBundle.trivia?.length,
        math: freeBundle.math?.length,
        mindfulness: freeBundle.mindfulness?.length,
        motivation: freeBundle.motivation?.length,
      } : null,
    },
    premium: {
      ready: premiumBundle?.date === today,
      date: premiumBundle?.date || null,
      items: premiumBundle ? {
        trivia: premiumBundle.trivia?.length,
        math: premiumBundle.math?.length,
        mindfulness: premiumBundle.mindfulness?.length,
        motivation: premiumBundle.motivation?.length,
      } : null,
    },
  });
});

module.exports = router;
