export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { reportId } = req.query;
  const apiKey = process.env.WARCRAFTLOGS_API_KEY;

  console.log(`[fights.js] Received request for reportId: ${reportId}`);
  console.log(`[fights.js] API Key configured: ${apiKey ? 'YES' : 'NO'}`);

  if (!apiKey) {
    console.error('[fights.js] ERROR: API key not configured');
    return res.status(500).json({ error: 'API key not configured in environment' });
  }

  if (!reportId) {
    console.error('[fights.js] ERROR: reportId not provided');
    return res.status(400).json({ error: 'reportId required' });
  }

  try {
    const url = `https://www.warcraftlogs.com/api/v1/report/fights/${reportId}?api_key=${apiKey}`;
    console.log(`[fights.js] Fetching from Warcraft Logs...`);
    
    const response = await fetch(url);

    console.log(`[fights.js] Warcraft Logs response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[fights.js] ERROR: WL returned ${response.status}: ${errorText}`);
      return res.status(response.status).json({ error: `Warcraft Logs API error: ${response.status}` });
    }

    const data = await response.json();
    console.log(`[fights.js] SUCCESS: Got ${data.fights ? data.fights.length : 0} fights`);
    return res.status(200).json(data);
  } catch (error) {
    console.error(`[fights.js] EXCEPTION: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}
