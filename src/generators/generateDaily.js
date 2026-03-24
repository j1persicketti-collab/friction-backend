require('dotenv').config();
const { generateContentBundle, saveBundle } = require('./contentGenerator');

async function generateDaily() {
  console.log('[daily] Starting daily content generation...');

  try {
    // Generate free tier
    const freeBundle = await generateContentBundle('free');
    saveBundle(freeBundle, 'free');

    // Small pause to be kind to the API
    await new Promise((r) => setTimeout(r, 2000));

    // Generate premium tier
    const premiumBundle = await generateContentBundle('premium');
    saveBundle(premiumBundle, 'premium');

    console.log('[daily] ✓ Both bundles generated and saved successfully.');
    console.log(`[daily] Date: ${freeBundle.date}`);
    console.log(`[daily] Free: ${freeBundle.trivia.length} trivia, ${freeBundle.math.length} math, ${freeBundle.mindfulness.length} mindfulness`);
    console.log(`[daily] Premium: ${premiumBundle.trivia.length} trivia, ${premiumBundle.math.length} math, ${premiumBundle.mindfulness.length} mindfulness`);

  } catch (err) {
    console.error('[daily] ✗ Generation failed:', err.message);
    process.exit(1);
  }
}

generateDaily();
