const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { prompt } = JSON.parse(body);
      if (!prompt) {
        res.status(400).json({ error: 'Missing prompt' });
        return;
      }

      const payload = JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => { data += chunk; });
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            res.status(apiRes.statusCode).json(parsed);
          } catch(e) {
            res.status(500).json({ error: 'Failed to parse Anthropic response' });
          }
        });
      });

      apiReq.on('error', (e) => {
        res.status(500).json({ error: e.message });
      });

      apiReq.write(payload);
      apiReq.end();

    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });
};
