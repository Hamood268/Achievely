const { RAWG_GAMES } = require('./constants');

async function fetchScreenshots(gameId) {
    try {
    const url = `${RAWG_GAMES.GAMES}/${gameId}/screenshots`;
    const params = new URLSearchParams({
      key: process.env.RAWG_KEY,
    });

        const res = await fetch (`${url}?${params}`);
        let resData = await res.json();

    if (!resData.results) {
      return []
    };

    const screenshots = resData?.results.map((s) => s.image);
    return screenshots;

    } catch (error) {
    console.log(`failed to fetch rawg screenshots`, error.message);
    return [];
  }
}

module.exports = { fetchScreenshots }