export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  const { reportId, fightIds, playerName } = req.body;
  const apiKey = process.env.WARCRAFTLOGS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!reportId || !fightIds || !playerName) {
    return res.status(400).json({ error: 'reportId, fightIds, playerName required' });
  }

  try {
    const abilities = {};

    // Fetch damage events for all fights
    for (const fightId of fightIds) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const damageUrl = `https://www.warcraftlogs.com/api/v1/report/events/damage/${reportId}?fight=${fightId}&api_key=${apiKey}&limit=10000&start=${offset}`;
        const response = await fetch(damageUrl);

        if (!response.ok) {
          throw new Error(`Damage API error: ${response.status}`);
        }

        const data = await response.json();
        const events = data.events || [];

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

    // Fetch cast events for all fights
    for (const fightId of fightIds) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const castsUrl = `https://www.warcraftlogs.com/api/v1/report/events/casts/${reportId}?fight=${fightId}&api_key=${apiKey}&limit=10000&start=${offset}`;
        const response = await fetch(castsUrl);

        if (!response.ok) {
          throw new Error(`Casts API error: ${response.status}`);
        }

        const data = await response.json();
        const events = data.events || [];

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

    return res.status(200).json({ abilities });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
