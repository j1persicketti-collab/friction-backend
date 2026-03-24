# Friction Backend — Content API

Node.js server that uses Claude AI to generate fresh puzzles, trivia, and mindfulness content daily.

## Quick Start

```bash
cd friction-backend
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm run dev
```

## Generate content manually

```bash
npm run generate
# Generates both free + premium bundles and saves to /data/
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Server health check |
| `GET /content/status` | Is today's content ready? |
| `GET /content/daily?tier=free` | Full daily bundle |
| `GET /content/daily?tier=premium` | Premium bundle |
| `GET /content/live?type=trivia` | Generate one item live |
| `GET /content/mindfulness` | Random mindfulness tip |
| `GET /content/motivation` | Today's motivational quote |

All `/content/*` routes require header: `x-friction-key: YOUR_API_SECRET`

## Deploy to Railway (free tier, recommended)

1. Push this folder to a GitHub repo
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard:
   - `ANTHROPIC_API_KEY`
   - `API_SECRET`
   - `PORT` (Railway sets this automatically)
4. Done — Railway gives you a public URL

**Cost:** Railway free tier = $5 credit/month. The cron job calls Claude twice a day (free + premium bundles). Each call costs ~$0.01–0.03. Monthly API cost: ~$0.60–$1.80. Well within free tier.

## Deploy to Render (alternative)

1. Push to GitHub
2. New Web Service on https://render.com
3. Build command: `npm install`
4. Start command: `npm start`
5. Add env vars

## Update the app

After deploying, update `API_BASE` in:
`friction/src/utils/contentService.ts`

```typescript
const API_BASE = 'https://your-app.railway.app';
const API_KEY = 'your_api_secret';
```

## Content costs (Claude API)

| Bundle | Tokens (approx) | Cost |
|---|---|---|
| Free daily | ~1,500 in + 1,200 out | ~$0.012 |
| Premium daily | ~1,500 in + 2,000 out | ~$0.018 |
| Live item (fallback) | ~200 in + 200 out | ~$0.001 |

Monthly total (2 bundles/day + ~10 live fallbacks): **~$1.00–$2.00**
