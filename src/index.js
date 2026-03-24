require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const contentRoutes = require('./routes/content');
const { requireApiKey } = require('./middleware/auth');
const { generateContentBundle, saveBundle } = require('./generators/contentGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting — 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Slow down.' },
});
app.use(limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/content', requireApiKey, contentRoutes);

// ─── Daily cron job ───────────────────────────────────────────────────────────
// Runs at 3:00 AM every day — generates fresh content before users wake up
const cronHour = process.env.DAILY_GENERATE_HOUR || '3';

cron.schedule(`0 ${cronHour} * * *`, async () => {
  console.log('[cron] Starting scheduled daily content generation...');
  try {
    const freeBundle = await generateContentBundle('free');
    saveBundle(freeBundle, 'free');
    await new Promise((r) => setTimeout(r, 2000));
    const premiumBundle = await generateContentBundle('premium');
    saveBundle(premiumBundle, 'premium');
    console.log('[cron] ✓ Daily content generation complete.');
  } catch (err) {
    console.error('[cron] ✗ Daily generation failed:', err.message);
  }
});

// ─── On startup: generate if today's content is missing ──────────────────────
async function generateIfMissing() {
  const { loadLatest } = require('./generators/contentGenerator');
  const today = new Date().toISOString().split('T')[0];
  const freeBundle = loadLatest('free');

  if (!freeBundle || freeBundle.date !== today) {
    console.log('[startup] No content for today — generating now...');
    try {
      const fb = await generateContentBundle('free');
      saveBundle(fb, 'free');
      const pb = await generateContentBundle('premium');
      saveBundle(pb, 'premium');
      console.log('[startup] ✓ Content ready.');
    } catch (err) {
      console.error('[startup] ✗ Failed to generate startup content:', err.message);
      console.log('[startup] App will use fallback content until generation succeeds.');
    }
  } else {
    console.log(`[startup] ✓ Content already exists for ${today}.`);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🔥 Friction backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Content status: http://localhost:${PORT}/content/status`);
  console.log(`   Daily cron: ${cronHour}:00 AM\n`);
  await generateIfMissing();
});
