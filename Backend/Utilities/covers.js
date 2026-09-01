const { RAWG_GAMES, STEAMGRID } = require("./constants");
const redis = require("./redis");

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ONE_DAY = 60 * 60 * 24;
const NONE_SENTINEL = "NONE"; 

async function safeCacheGet(key) {
  try {
    const value = await redis.get(key);
    return value === undefined ? null : value;
  } catch (error) {
    console.log(`Redis get failed for key "${key}":`, error.message);
    return null;
  }
}

async function safeCacheSet(key, value, ttlSeconds) {
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.log(`Redis set failed for key "${key}":`, error.message);
  }
}

async function fetchAppId(gameId) {
  const cacheKey = `steamAppId:${gameId}`;

  const cached = await safeCacheGet(cacheKey);
  if (cached !== null) {
    return cached === NONE_SENTINEL ? null : cached;
  }

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
      await safeCacheSet(cacheKey, NONE_SENTINEL, THIRTY_DAYS);
      return null;
    }

    const appId = steam_appId.url?.match(/\/app\/(\d+)/)?.[1] ?? null;

    if (!appId) {
      await safeCacheSet(cacheKey, NONE_SENTINEL, THIRTY_DAYS);
      return null;
    }

    await safeCacheSet(cacheKey, appId, THIRTY_DAYS);
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
  const cacheKey = appId
    ? `cover:app:${appId}`
    : gameName
      ? `cover:name:${gameName}`
      : null;

  if (cacheKey) {
    const cached = await safeCacheGet(cacheKey);
    if (cached !== null) {
      return cached === NONE_SENTINEL ? rawgCover || null : cached;
    }
  }

  if (appId) {
    try {
      const steamUrl = `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
      const check = await fetch(steamUrl, { method: "HEAD" });

      if (check.ok) {
        if (cacheKey) await safeCacheSet(cacheKey, steamUrl, THIRTY_DAYS);
        return steamUrl;
      }
    } catch (error) {
      console.log("Steam portrait cover failed:", error.message);
    }

    try {
      const res = await fetch(
        `${STEAMGRID.GRIDS_PLATFORM}${appId}?dimensions=600x900&types=static&nsfw=false&limit=1&styles=alternate`,
        {
          headers: { Authorization: `Bearer ${process.env.STEAMGRID_KEY}` },
        },
      );

      if (!res.ok) {
        console.log(
          `SteamGridDB platform cover HTTP ${res.status} for appId ${appId}`,
        );
      } else {
        const data = await res.json();
        const cover = data.data?.[0]?.url ?? null;
        if (cover) {
          if (cacheKey) await safeCacheSet(cacheKey, cover, THIRTY_DAYS);
          return cover;
        }
      }
    } catch (error) {
      console.log("SteamGridDB appId cover failed:", error.message);
    }
  }

  if (gameName) {
    try {
      const cover = await steamGrids(gameName);
      if (cover && typeof cover === "string") {
        if (cacheKey) await safeCacheSet(cacheKey, cover, THIRTY_DAYS);
        return cover;
      }
    } catch (error) {
      console.log("SteamGridDB name cover failed:", error.message);
    }
  }

  if (cacheKey) await safeCacheSet(cacheKey, NONE_SENTINEL, ONE_DAY);

  if (rawgCover) return rawgCover;

  console.log(`No cover resolved for appId: ${appId} — game: ${gameName}`);
  return null;
}

async function steamGridSearch(name) {
  try {
    const search = await fetch(
      `${STEAMGRID.SEARCH}${encodeURIComponent(name)}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STEAMGRID_KEY}`,
        },
      },
    );

    if (!search.ok) {
      console.log(`SteamGridDB search HTTP ${search.status} for "${name}"`);
      return null;
    }

    const data = await search.json();

    if (!data.data || data.data.length === 0) {
      return null;
    }

    const id = data.data[0].id;
    return id;
  } catch (error) {
    console.log("SteamGridDB search failed:", error.message);
    return null;
  }
}

async function steamGrids(name) {
  try {
    const id = await steamGridSearch(name);

    if (!id) return null;

    const params = new URLSearchParams({
      dimensions: "600x900",
      mimes: "image/png,image/jpeg",
      types: "static",
      nsfw: false,
      limit: 1,
      styles: "alternate",
    });

    const res = await fetch(`${STEAMGRID.GRIDS}${id}?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.STEAMGRID_KEY}`,
      },
    });

    if (!res.ok) {
      console.log(`SteamGridDB grids HTTP ${res.status} for id ${id}`);
      return null;
    }

    const data = await res.json();

    if (!data.data) {
      return null;
    }

    const cover = data.data?.[0]?.url ?? null;

    return cover;
  } catch (error) {
    console.log("Error while fetching game grid:", error.message);
    return null;
  }
}

async function steamHeroes(appId, gameName) {
  const cacheKey = appId
    ? `hero:app:${appId}`
    : gameName
      ? `hero:name:${gameName}`
      : null;

  if (cacheKey) {
    const cached = await safeCacheGet(cacheKey);
    if (cached !== null) {
      return cached === NONE_SENTINEL ? null : cached;
    }
  }

  try {
    const params = new URLSearchParams({
      dimensions: "3840x1240",
      mimes: "image/png,image/jpeg",
      types: "static",
      styles: "alternate",
      nsfw: false,
      limit: 1,
    });

    if (appId) {
      const res = await fetch(
        `${STEAMGRID.HEROES_PLATOFRM}${appId}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.STEAMGRID_KEY}`,
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const banner = data.data?.[0]?.url ?? null;
        if (banner) {
          if (cacheKey) await safeCacheSet(cacheKey, banner, THIRTY_DAYS);
          return banner;
        }
      } else {
        console.log(
          `SteamGridDB heroes platform HTTP ${res.status} for appId ${appId}`,
        );
      }
    }

    if (gameName) {
      const id = await steamGridSearch(gameName);
      if (!id) {
        if (cacheKey) await safeCacheSet(cacheKey, NONE_SENTINEL, ONE_DAY);
        return null;
      }

      const res = await fetch(`${STEAMGRID.HEROES}${id}?${params}`, {
        headers: {
          Authorization: `Bearer ${process.env.STEAMGRID_KEY}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const banner = data.data?.[0]?.url ?? null;
        if (banner) {
          if (cacheKey) await safeCacheSet(cacheKey, banner, THIRTY_DAYS);
          return banner;
        }
      } else {
        console.log(`SteamGridDB heroes HTTP ${res.status} for id ${id}`);
      }
    }

    if (cacheKey) await safeCacheSet(cacheKey, NONE_SENTINEL, ONE_DAY);
    return null;
  } catch (error) {
    console.log("Error while fetching game hero banner:", error.message);
    return null;
  }
}

module.exports = {
  fetchAppId,
  resolveCover,
  steamGridSearch,
  steamGrids,
  steamHeroes,
};