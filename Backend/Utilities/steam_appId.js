const { RAWG_GAMES } = require("./constants");

async function fetchAppId(gameId) {
  try {
    const rawg_params = new URLSearchParams({
      key: process.env.RAWG_KEY,
    });

    const storesRes = await fetch(
      `${RAWG_GAMES.GAMES}/${gameId}/stores?${rawg_params}`,
    );
    const stores = await storesRes.json();

    const steam_appId = stores.results.find((store) => store.store_id === 1);

    if (!steam_appId) {
      return { code: 200, status: "OK", message: "This game is not available on Steam. Achievement data unavailable." };
    }

    const appId = steam_appId.url?.match(/\/app\/(\d+)/)?.[1] ?? null;

    if (!appId) {
      return { code: 200, status: "OK", message: "Could not resolve a Steam App ID for this game. Achievement data unavailable." };
    }

    return appId;
  } catch (error) {
    console.log("Error while fetching steam app Id", error);
    return { error: true, code: 500, status: "Internal Server Error", message: "An error happened while fetching the Steam app ID." };
  }
}

async function resolveCover(appId, fallback = null) {
  if (!appId) return fallback;
  const steamUrl = `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
  try {
    const check = await fetch(steamUrl, { method: "HEAD" });
    return check.ok ? steamUrl : fallback;
  } catch {
    return fallback;
  }
}

module.exports = { fetchAppId, resolveCover };