const { RAWG_GAMES, STEAMGRID } = require("./constants");

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
      return {
        code: 200,
        status: "OK",
        message:
          "This game is not available on Steam. Achievement data unavailable.",
      };
    }

    const appId = steam_appId.url?.match(/\/app\/(\d+)/)?.[1] ?? null;

    if (!appId) {
      return {
        code: 200,
        status: "OK",
        message:
          "Could not resolve a Steam App ID for this game. Achievement data unavailable.",
      };
    }

    return appId;
  } catch (error) {
    console.log("Error while fetching steam app Id", error);
    return {
      error: true,
      code: 500,
      status: "Internal Server Error",
      message: "An error happened while fetching the Steam app ID.",
    };
  }
}

async function resolveCover(appId, gameName, rawgCover = null) {

  if (appId) {
    try {
      const steamUrl = `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`
      const check = await fetch(steamUrl, { method: 'HEAD' })
      if (check.ok) return steamUrl
    } catch (error) {
      console.log('Steam portrait cover failed:', error.message)
    }

    try {
      const headerUrl = `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
      const check = await fetch(headerUrl, { method: 'HEAD' })
      if (check.ok) return headerUrl
    } catch (error) {
      console.log('Steam header cover failed:', error.message)
    }
  }

  if (gameName) {
    try {
      const cover = await steamGrids(gameName)
      if (cover && typeof cover === 'string') return cover
    } catch (error) {
      console.log('SteamGridDB cover failed:', error.message)
    }
  }

  if (rawgCover) {
    return rawgCover
  }

  console.log(`No cover resolved for appId: ${appId} — game: ${gameName}`)
  return null
}

async function steamGridSearch(name) {
  try {
    const search = await fetch(`${STEAMGRID.SEARCH}${name}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STEAMGRID_KEY}`,
      },
    });

    const data = await search.json();

    if (!data.data) {
      return {
        code: 200,
        status: "OK",
        message: "Could not Find this game",
      };
    }

    const id = data.data[0].id;
    return id;
  } catch (error) {
    console.log("Error while fetching steam app Id", error);
    return {
      error: true,
      code: 500,
      status: "Internal Server Error",
      message: "An error happened while fetching the Steam app ID.",
    };
  }
}

async function steamGrids(name) {
  try {
    const id = await steamGridSearch(name);

    const params = new URLSearchParams({
      styles: "alternate",
      dimensions: "600x900",
      mimes: "image/png,image/jpeg",
      types: "static",
      nsfw: false,
      limit: 1,
    });

    const res = await fetch(`${STEAMGRID.GRIDS}${id}?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.STEAMGRID_KEY}`,
      },
    });

    const data = await res.json();

    if (!data.data) {
      return {
        code: 200,
        status: "OK",
        message: "Could not Find this game grid",
      };
    }

    const cover = data.data?.[0]?.url ?? null;

    return cover;
  } catch (error) {
    console.log("Error while fetching game grid", error);
    return {
      error: true,
      code: 500,
      status: "Internal Server Error",
      message: "An error happened while fetching the game grid.",
    };
  }
}

async function steamHeroes(name) {
  try {
    const id = await steamGridSearch(name);

    const params = new URLSearchParams({
      styles: "alternate",
      dimensions: "3840x1240",
      mimes: "image/png, image/jpeg",
      types: "static",
      nsfw: false,
      limit: 1,
    });

    const res = await fetch(`${STEAMGRID.HEROES}${id}?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.STEAMGRID_KEY}`,
      },
    });

    const data = await res.json();

    if (!data.data) {
      return {
        code: 200,
        status: "OK",
        message: "Could not Find this game hero banner",
      };
    }

    const cover = data.data?.[0]?.url ?? null;

    return cover;
  } catch (error) {
    console.log("Error while fetching game hero banner", error);
    return {
      error: true,
      code: 500,
      status: "Internal Server Error",
      message: "An error happened while fetching the game hero banner.",
    };
  }
}

module.exports = {
  fetchAppId,
  resolveCover,
  steamGridSearch,
  steamGrids,
  steamHeroes,
};
