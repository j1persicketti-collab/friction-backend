// Simple API key auth middleware
// The app sends this key with every request — keeps randos from hammering your API

function requireApiKey(req, res, next) {
  const key = req.headers['x-friction-key'] || req.query.key;

  if (!process.env.API_SECRET) {
    // No secret set — allow all (dev mode)
    return next();
  }

  if (key !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = { requireApiKey };
