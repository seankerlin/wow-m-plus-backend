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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  const { reportId, fightIds, playerName } = req.body;
  const apiKey = process.env.WARCRAFTLOGS_API_KEY;

  console.log(`[analyze.js] Received request for reportId: ${reportId}, fights: ${fightIds?.length}, player: ${playerName}`);
  console.log(`[analyze.js] API Key configured: ${apiKey ? 'YES' : 'NO'}`);

  if (!apiKey) {
    console.error('[analyze.js] ERROR: API key not configured');
    return res.status(500).json({ error: 'API key not configured in environment' });
  }

  if (!reportId || !fightIds || !playerName) {
    console.error('[analyze.js] ERROR: Missing required fields');
    return res.status(400).json({ error: 'reportId, fightIds, playerName required' });
  }

  try {
    const abilities = {};

    console.log(`[analyze.js] Starting to fetch damage events for ${fightIds.length} fights...`);

    // Fetch damage events for all fights
    for (const fightId of fightIds) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const damageUrl = `https://www.warcraftlogs.com/api/v1/report/events/damage/${reportId}?fight=${fightId}&api_key=${apiKey}&limit=10000&start=${offset}`;
        console.log(`[analyze.js] Fetching damage for fight ${fightId}, offset ${offset}...`);
        
        const response = await fetch(damageUrl);

        if (!response.ok) {
          console.error(`[analyze.js] ERROR: Damage API returned ${response.status}`);
          throw new Error(`Damage API error: ${response.status}`);
        }

        const data = await response.json();
        const events = data.events || [];

        console.log(`[analyze.js] Got ${events.length} damage events from fight ${fightId}`);

        // Filter for player and aggregate
        events.forEach(event => {
          if (event.source?.name === playerName && event.ability?.name) {
            const abilityName = event.ability.name;
            if (!abilities[abilityName]) {
              abilities[abilityName] = { damage: 0, casts: 0 };
            }
            abilities[abilityName].damage += event.amount || 0;
          }
        });

        hasMore = data.nextPageTimestamp ? true : false;
        offset = data.nextPageTimestamp || 0;
      }
    }

    console.log(`[analyze.js] Starting to fetch cast events...`);

    // Fetch cast events for all fights
    for (const fightId of fightIds) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const castsUrl = `https://www.warcraftlogs.com/api/v1/report/events/casts/${reportId}?fight=${fightId}&api_key=${apiKey}&limit=10000&start=${offset}`;
        console.log(`[analyze.js] Fetching casts for fight ${fightId}, offset ${offset}...`);
        
        const response = await fetch(castsUrl);

        if (!response.ok) {
          console.error(`[analyze.js] ERROR: Casts API returned ${response.status}`);
          throw new Error(`Casts API error: ${response.status}`);
        }

        const data = await response.json();
        const events = data.events || [];

        console.log(`[analyze.js] Got ${events.length} cast events from fight ${fightId}`);

        // Filter for player and count casts
        events.forEach(event => {
          if (event.source?.name === playerName && event.ability?.name) {
            const abilityName = event.ability.name;
            if (!abilities[abilityName]) {
              abilities[abilityName] = { damage: 0, casts: 0 };
            }
            abilities[abilityName].casts += 1;
          }
        });

        hasMore = data.nextPageTimestamp ? true : false;
        offset = data.nextPageTimestamp || 0;
      }
    }

    console.log(`[analyze.js] SUCCESS: Aggregated ${Object.keys(abilities).length} unique abilities`);
    return res.status(200).json({ abilities });
  } catch (error) {
    console.error(`[analyze.js] EXCEPTION: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
}
