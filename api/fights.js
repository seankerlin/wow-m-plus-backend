export default async function handler(req, res) {
  const { reportId } = req.query;
  const apiKey = process.env.WARCRAFTLOGS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!reportId) {
    return res.status(400).json({ error: 'reportId required' });
  }

  try {
    const response = await fetch(
      `https://www.warcraftlogs.com/api/v1/report/fights/${reportId}?api_key=${apiKey}`
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Warcraft Logs API error' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
