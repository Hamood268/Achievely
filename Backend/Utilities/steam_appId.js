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

    const steam_appId = stores.results.find((store) => store.store_id == 1);

    if (!steam_appId) {
      return { error: true, code: 404, status: "Not Found", message: "The game is not available on Steam." };
    }

    const appId = steam_appId.url?.match(/\/app\/(\d+)/)?.[1] ?? null;

    if (!appId) {
      return { error: true, code: 404, status: "Not Found", message: "Could not extract a valid Steam appId for this game." };
    }

    return appId;
  } catch (error) {
    console.log("Error while fetching steam app Id", error);
    return { error: true, code: 500, status: "Internal Server Error", message: "An error happened while fetching the Steam app ID." };
  }
}

module.exports = { fetchAppId }