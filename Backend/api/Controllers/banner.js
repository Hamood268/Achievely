const crypto = require("crypto");
const redis = require("../../Utilities/redis");

const BANNER_KEY = "site:banner";

const VALID_PAGES = ["home", "library", "game", "calendar", "achievements", "profile", "faq",];
const VALID_COLORS = ["cyan", "green", "amber", "red", "purple"];
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const DEFAULT_BANNER = {
  enabled: false,
  title: "",
  message: "",
  color: "cyan",
  pages: [],
  expiresAt: null,
  linkUrl: "",
  linkText: "",
  updatedAt: 0,
};


const SAFE_LINK_RE = /^(\/(?!\/)|https?:\/\/)/i;


const isValidAdminKey = (providedKey) => {
  const expected = process.env.ADMIN_KEY;
  if (!expected || typeof providedKey !== "string") return false;

  const a = Buffer.from(providedKey);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(expected));
    return false;
  }
  return crypto.timingSafeEqual(a, b);
};

const getBanner = async (req, res) => {
  try {
    const banner = (await redis.get(BANNER_KEY)) || DEFAULT_BANNER;
    return res.status(200).json({ code: 200, status: "OK", banner });
  } catch (error) {
    console.log("Error while fetching banner", error);
    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message: "Could not load banner.",
    });
  }
};


const verifyAdminKey = async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ code: 401, status: "Unauthorized", valid: false });
  }
  return res.status(200).json({ code: 200, status: "OK", valid: true });
};


const updateBanner = async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"];
    if (!isValidAdminKey(adminKey)) {
      return res.status(401).json({
        code: 401,
        status: "Unauthorized",
        message: "Invalid or missing admin key.",
      });
    }

    const { enabled, title, message, color, pages, expiresAt, linkUrl, linkText } = req.body || {};

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "'enabled' must be a boolean.",
      });
    }
    if (typeof title !== "string" || title.length > 120) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "'title' must be a string up to 120 characters.",
      });
    }
    if (typeof message !== "string" || message.length > 300) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "'message' must be a string up to 300 characters.",
      });
    }
    if (!VALID_COLORS.includes(color) && !HEX_COLOR_RE.test(color || "")) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: `'color' must be one of ${VALID_COLORS.join(", ")}, or a hex code like #ff8800.`,
      });
    }
    if (!Array.isArray(pages) || !pages.every((p) => VALID_PAGES.includes(p))) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: `'pages' must be an array made up of: ${VALID_PAGES.join(", ")}.`,
      });
    }

    let cleanExpiresAt = null;
    if (expiresAt !== null && expiresAt !== undefined && expiresAt !== "") {
      const ts = Number(expiresAt);
      if (!Number.isFinite(ts)) {
        return res.status(400).json({
          code: 400,
          status: "Bad Request",
          message: "'expiresAt' must be a timestamp (ms) or null.",
        });
      }
      cleanExpiresAt = ts;
    }

    const cleanLinkUrl = typeof linkUrl === "string" ? linkUrl.trim() : "";
    if (cleanLinkUrl) {
      if (cleanLinkUrl.length > 300 || !SAFE_LINK_RE.test(cleanLinkUrl)) {
        return res.status(400).json({
          code: 400,
          status: "Bad Request",
          message: "'linkUrl' must be a relative path (starting with /) or an http(s) URL, up to 300 characters.",
        });
      }
    }
    if (typeof linkText !== "string" || linkText.length > 40) {
      return res.status(400).json({
        code: 400,
        status: "Bad Request",
        message: "'linkText' must be a string up to 40 characters.",
      });
    }

    const banner = {
      enabled,
      title: title.trim(),
      message: message.trim(),
      color,
      pages,
      expiresAt: cleanExpiresAt,
      linkUrl: cleanLinkUrl,
      linkText: cleanLinkUrl ? (linkText.trim() || "Learn more") : "",
      updatedAt: Date.now(),
    };

    await redis.set(BANNER_KEY, banner);
    return res.status(200).json({ code: 200, status: "OK", banner });
  } catch (error) {
    console.log("Error while updating banner", error);
    return res.status(500).json({
      code: 500,
      status: "Internal Server Error",
      message: "Could not update banner.",
    });
  }
};

module.exports = { getBanner, updateBanner, verifyAdminKey, VALID_PAGES, VALID_COLORS };
