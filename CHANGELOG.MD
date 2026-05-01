# Changelog

All notable changes to Achievely will be documented in this file.

---

## [1.1.0] — 2026-05-01

### Summary
V1.1 focuses on visual polish and profile depth. SteamGridDB integration transforms the library with proper portrait covers and atmospheric game headers. Profile pages now surface owned games, jump back in sections, and Steam store pricing — making Achievely feel like a complete product rather than a tracker.

### 📚 Library Page
- Game cards now display proper 600x900 portrait covers via SteamGridDB
- Cover fallback chain — Steam CDN → SteamGridDB by appId → RAWG → placeholder
- Fixed blank cover bug where Steam CDN returned a grey placeholder with 200 status
- Jump Back In section — recently played games surfaced prominently (Only if linked a SteamId)

### 👤 Profile Page
- Owned games section added — full Steam library with playtime data
- Achievement completion percentage shown per recently played game
- Last played timestamp added per game
- Added Total games, Time Played and Most Played stats card

### 🎮 Game Detail Page
- Dynamic header banner in page background sourced from SteamGridDB
- Steam store pricing added — current price, original price, discount percentage
- All purchase editions listed — Standard, Deluxe, Ultimate etc
- On sale indicator when discount is active
- DLC list added
- Official Steam screenshots replace RAWG screenshots when available

### 🔧 Extra
- PWA manifest added — Achievely is now installable on desktop and mobile (uses web version)

*Built with 💛 and way too many Steam hours*