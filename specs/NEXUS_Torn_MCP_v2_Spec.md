# TORN MCP v2 — COMPLETE REWRITE SPECIFICATION
## The Delta Engine oraN Asked For

**Author:** NEXUS  
**Date:** March 17, 2026  
**Purpose:** Replace the current torn-mcp with a comprehensive MCP server that exposes the FULL power of the Torn API v2, including historical personal stats with `timestamp`, faction-wide stat sweeps, ranked war reports, and attack log analysis with `from`/`to` filtering.  
**Deployment:** Node.js on Railway (`torn-mcp-production.up.railway.app`)  
**Runtime:** Express + @modelcontextprotocol/sdk

---

## WHY THIS EXISTS

oraN's request (March 17, 2026):
> "Can you do like last 6 wars analysis in table format, and an overall faction report of public personal stats using your MCP — 1 month, 3 month comparison. Then use it to find gaps — member not doing missions, not attacking, not refilling, members not at 5k items dumped, members with low honor bars."

The current MCP's `get_player_personal_stats` tool calls the Torn API **without** the `timestamp` or `stat` parameters. It only returns current lifetime totals. This means NEXUS can only see where someone is NOW — not where they were 30 or 90 days ago. No deltas, no gap detection, no trend analysis.

oraN is right: the Torn API supports `timestamp` on `/user/{id}/personalstats` with a **public** key. You can pull any player's stats at any historical point in time (up to 10 specific stat names per call). This is the delta engine.

---

## ARCHITECTURE

### Environment Variables

```
TORN_API_KEY          — Primary API key (public access minimum, limited preferred)
TORN_API_KEY_2        — Secondary key for rate limit distribution (optional)
TORN_API_KEY_3        — Tertiary key (optional)
TORNSTATS_API_KEY     — TornStats API key (for CPR, spy, war data)
PORT                  — Server port (default 3001)
```

### Rate Limiting

- Torn API: 100 requests/minute per key, 1000/minute per IP
- Personal stats are "cloud storage" — 50,000 rows/day rolling limit
- Cache: 29-second TTL per unique query (changing `timestamp`/`stat` does NOT bust cache — same 29s window)
- Strategy: Round-robin across available keys, 650ms delay between calls to same endpoint, batch operations respect limits

### Base URL

All Torn API v2 calls go to: `https://api.torn.com/v2`

---

## TOOL INVENTORY — 25 TOOLS

### Category 1: FACTION ROSTER & BASICS (3 tools)

#### `get_faction_basic`
**What it does:** Returns faction info + full member roster with IDs, names, levels, positions, days in faction, last action, status.  
**Torn endpoint:** `GET /faction/basic` (own faction) or `GET /faction/{id}/basic` (any faction)  
**Parameters:**
- `factionId` (optional string) — Faction ID. Omit for own faction.

**Key fields returned:**
```json
{
  "id": 9305,
  "name": "Legitimate Business",
  "tag": "LB",
  "leader": 2532040,
  "coleader": 1778676,
  "respect": 8850000,
  "age": 6313,
  "capacity": 100,
  "best_chain": 50000,
  "rank": { "level": 18, "name": "Diamond", "division": 1, "position": 78 },
  "members": {
    "2532040": { "name": "BigTasty420", "level": 100, "days_in_faction": 1500, "position": "Leader", "last_action": { "status": "Online", "timestamp": 1710680000, "relative": "2 minutes ago" }, "status": { "state": "Okay" } },
    ...
  },
  "ranked_wars": { "38288": { "factions": { "9305": { "name": "Legitimate Business", "score": 150 }, "23952": { "name": "Midnight Plague", "score": 80 } }, "start": 1710600000, "end": 0, "target": 200, "winner": 0 } }
}
```

**Why it matters:** This is the roster truth source. Every faction-wide sweep starts here to get member IDs.

---

#### `get_faction_members`
**What it does:** Returns ONLY the member list from faction basic (lighter call, same endpoint, parsed down).  
**Torn endpoint:** `GET /faction/{id}/basic` → extract `members` object only  
**Parameters:**
- `factionId` (optional string) — Faction ID. Omit for own faction.

**Returns:** Array of `{ id, name, level, days_in_faction, position, last_action, status }`

**Why it matters:** When you just need IDs and names for a sweep, don't return the full faction payload.

---

#### `get_faction_rankedwars`
**What it does:** Returns all ranked wars for a faction (current and historical).  
**Torn endpoint:** `GET /faction/{id}/rankedwars` or `GET /faction/rankedwars`  
**Parameters:**
- `factionId` (optional string) — Faction ID. Omit for own faction.

**Returns:** Object keyed by war ID with factions, scores, start/end timestamps, target, winner.

**Key insight:** `end: 0` means the war is still active. Non-zero = concluded. War IDs are the input for `get_ranked_war_report`.

---

### Category 2: PERSONAL STATS — THE DELTA ENGINE (5 tools)

#### `get_player_personal_stats`
**What it does:** Returns personal stats for any player, optionally at a historical timestamp, optionally filtered to specific stats or a category.  
**Torn endpoint:** `GET /user/{id}/personalstats`  
**Parameters:**
- `playerId` (required string) — Player ID
- `category` (optional string) — One of: `attacking`, `jobs`, `trading`, `jail`, `hospital`, `finishinghits`, `communication`, `criminaloffenses`, `bounties`, `items`, `travel`, `drugs`, `missions`, `racing`, `networth`, `other`, `all`, `popular`
- `stats` (optional string) — Comma-separated stat names, max 10. E.g. `"xantaken,attackswon,refills,itemsdumped,networth"`. Required when using `timestamp`.
- `timestamp` (optional integer) — Unix timestamp. Returns stat values at that point in time. When used, `stats` parameter is REQUIRED (max 10 stats).

**Access level:** Public key for public stats. Limited/Full for private stats (battlestats, investments, detailed networth).

**Critical behaviors:**
- Without `timestamp`: returns current values for the category
- With `timestamp` + `stats`: returns historical values at that point in time (snapped to nearest day)
- `cat=all` returns all public stats but counts toward the 50K cloud row limit
- `cat=popular` is lighter — use it when you don't need everything
- Historical stats that didn't exist at the given timestamp return nothing (not zero)

**Example calls:**
```
# Current attacking stats for player 2532040
GET /user/2532040/personalstats?cat=attacking&key=XXX

# Xanax taken + attacks won 30 days ago
GET /user/2532040/personalstats?stat=xantaken,attackswon&timestamp=1707955200&key=XXX
```

---

#### `get_player_stats_delta`
**What it does:** Computes the delta (change) in specific stats for a player over a time period. Makes TWO Torn API calls internally: one at `timestamp_from`, one current (or at `timestamp_to`).  
**Torn endpoint:** 2x `GET /user/{id}/personalstats` with different timestamps  
**Parameters:**
- `playerId` (required string) — Player ID
- `stats` (required string) — Comma-separated stat names, max 10. E.g. `"xantaken,attackswon,refills,attackslost,defendswon"`
- `days_ago` (optional integer, default 30) — How many days back to compare. Converted to Unix timestamp internally.
- `timestamp_from` (optional integer) — Explicit start timestamp (overrides `days_ago`)
- `timestamp_to` (optional integer) — Explicit end timestamp (default: omitted = current)

**Returns:**
```json
{
  "player_id": "2532040",
  "period_days": 30,
  "from_timestamp": 1707955200,
  "to_timestamp": null,
  "stats": {
    "xantaken": { "from": 2300, "to": 2450, "delta": 150, "per_day": 5.0 },
    "attackswon": { "from": 4200, "to": 4500, "delta": 300, "per_day": 10.0 },
    ...
  }
}
```

**Why it matters:** This is the single tool that makes oraN's request possible. One call = delta for one player.

---

#### `get_faction_stats_sweep`
**What it does:** Iterates over ALL members of a faction and pulls a specific set of stats (current + historical) for delta computation. This is the big one — the faction-wide activity report.  
**Torn endpoint:** 1x `GET /faction/{id}/basic` + 2x `GET /user/{id}/personalstats` per member  
**Parameters:**
- `factionId` (optional string) — Faction ID. Omit for own faction.
- `stats` (required string) — Comma-separated stat names, max 10. E.g. `"xantaken,attackswon,refills,itemsdumped,missionscompleted,networth,criminaloffenses"`
- `days_ago` (optional integer, default 30) — Delta period
- `timestamp_from` (optional integer) — Explicit start (overrides days_ago)

**Returns:**
```json
{
  "faction_id": "9305",
  "faction_name": "Legitimate Business",
  "member_count": 91,
  "period_days": 30,
  "members": [
    {
      "id": "2532040",
      "name": "BigTasty420",
      "level": 100,
      "stats": {
        "xantaken": { "from": 2300, "to": 2450, "delta": 150, "per_day": 5.0 },
        "attackswon": { "from": 4200, "to": 4500, "delta": 300, "per_day": 10.0 },
        ...
      }
    },
    ...
  ],
  "api_calls_made": 183,
  "errors": ["Player 1234567: API returned error 14 (daily limit)"]
}
```

**Rate limiting strategy:**
- With 1 key: ~90 members × 2 calls = 180 calls. At 100/min limit, takes ~2 minutes with 700ms spacing.
- With 3 keys: round-robin drops this to ~40 seconds.
- The tool should stream progress: "Processing member 15/91..."
- On rate limit (error 5): pause 30 seconds, retry.
- On cloud limit (error 14): report which members were missed.

**CRITICAL IMPLEMENTATION NOTE:** This tool will take 1-3 minutes to complete for a full faction. The MCP response should include a progress indicator and the tool should NOT timeout. Set Railway request timeout to 300 seconds.

---

#### `get_player_personal_stats_category`
**What it does:** Returns all stats in a specific category for a player. No timestamp — current values only. This is the "give me everything about their attacking" call.  
**Torn endpoint:** `GET /user/{id}/personalstats?cat={category}`  
**Parameters:**
- `playerId` (required string) — Player ID
- `category` (required string) — One of the 16 categories

**Returns:** All stats in that category as key-value pairs.

---

#### `get_player_honors`
**What it does:** Returns honor bars achieved by a player.  
**Torn endpoint:** `GET /user/{id}/honors` (requires minimal key for self, but honors are visible on profiles for all players via v1)  
**Parameters:**
- `playerId` (required string) — Player ID

**Note:** oraN wants to flag "members with low honor bars." This endpoint may require checking via v1 `user/{id}?selections=honors` if v2 restricts to self-only. Implementation should try v2 first, fall back to v1.

---

### Category 3: RANKED WAR REPORTS (3 tools)

#### `get_ranked_war_report`
**What it does:** Returns the full ranked war report for a specific war — both factions' member-level stats (attacks, respect, score contribution).  
**Torn endpoint:** `GET /torn/{rankedWarId}/rankedwarreport`  
**Parameters:**
- `warId` (required string) — Ranked war ID (from `get_faction_rankedwars`)

**Returns:**
```json
{
  "rankedwarreport": {
    "factions": {
      "9305": {
        "name": "Legitimate Business",
        "score": 450,
        "chain": 100,
        "members": {
          "2532040": { "name": "BigTasty420", "attacks": 25, "score": 85.5 },
          ...
        }
      },
      "23952": { ... }
    },
    "war": { "start": 1710600000, "end": 1710700000, "target": 200, "winner": 9305 }
  }
}
```

**Why it matters:** This is how you build the "last 6 wars analysis table."

---

#### `get_last_n_wars`
**What it does:** Convenience tool. Gets the last N ranked war reports for a faction. Calls `get_faction_rankedwars` then `get_ranked_war_report` for each.  
**Parameters:**
- `factionId` (optional string) — Faction ID
- `count` (optional integer, default 6) — How many wars to retrieve (max 20)

**Returns:** Array of war reports sorted by start time descending, each with full member-level data.

**Rate limiting:** N+1 API calls total. For 6 wars = 7 calls. Fast.

---

#### `get_war_stats`  
**What it does:** Gets war stat exchange data from TornStats for a specific war.  
**TornStats endpoint:** `GET https://www.tornstats.com/api/v2/{key}/wars/{warId}`  
**Parameters:**
- `warId` (required string) — TornStats war ID

**Returns:** Stat exchange data for both factions' members (attack stats, respect, assists, etc.)

---

### Category 4: ATTACK LOGS (3 tools)

#### `get_faction_attacks`
**What it does:** Returns faction attack logs with time filtering.  
**Torn endpoint:** `GET /faction/attacks` (own faction, requires AA key)  
**Parameters:**
- `from` (optional integer) — Unix timestamp, attacks after this time
- `to` (optional integer) — Unix timestamp, attacks before this time
- `limit` (optional integer, default 100, max 100) — Results per page
- `sort` (optional string) — `asc` or `desc` (default desc)

**Returns:** Array of attacks with attacker/defender IDs, result, respect earned, timestamps, fair fight values.

---

#### `get_faction_attacksfull`
**What it does:** Simplified faction attack logs — higher limit (1000), less detail per entry.  
**Torn endpoint:** `GET /faction/attacksfull`  
**Parameters:** Same as above but `limit` max 1000.

---

#### `get_player_attacks`
**What it does:** Returns attack logs for the key owner (or specific player if key has access).  
**Torn endpoint:** `GET /user/attacks` or `GET /user/{id}/attacks`  
**Parameters:**
- `playerId` (optional string) — Player ID (limited to key owner without full access)
- `from` (optional integer) — Unix timestamp
- `to` (optional integer) — Unix timestamp
- `limit` (optional integer, default 100, max 100)
- `sort` (optional string) — `asc` or `desc`
- `filter` (optional string) — `incoming` or `outgoing`

---

### Category 5: PLAYER PROFILES & INTEL (4 tools)

#### `get_player_profile`
**What it does:** Full player profile — level, status, faction, job, properties, spouse, life, last action, etc.  
**Torn endpoint:** `GET /user/{id}/profile`  
**Parameters:**
- `playerId` (required string) — Player ID

---

#### `get_player_hof`
**What it does:** Player's Hall of Fame rankings across all categories.  
**Torn endpoint:** `GET /user/{id}/hof`  
**Parameters:**
- `playerId` (required string) — Player ID

**Why it matters:** HoF rankings for battle stats can indicate relative strength even without spy data.

---

#### `get_spy_data`
**What it does:** Gets YATA spy data for a player (battle stats if available).  
**YATA endpoint:** (existing implementation, keep as-is)  
**Parameters:**
- `targetId` (required string) — Player ID

---

#### `get_faction_spies`
**What it does:** Gets all spy data the faction has collected (from YATA).  
**YATA endpoint:** (existing implementation, keep as-is)  
**Parameters:** None (uses faction AA key)

---

### Category 6: OC 2.0 (3 tools — existing, keep as-is)

#### `get_faction_crimes_v2`
**Parameters:**
- `cat` (required string) — `planning` or `completed`

#### `get_user_organized_crimes_v2`
No parameters (returns recruiting crimes with open slots).

#### `get_faction_cpr`
**TornStats endpoint.** Returns CPR data per member per crime per role.

---

### Category 7: FACTION INTEL (4 tools)

#### `get_faction_chain`
**What it does:** Current chain status.  
**Torn endpoint:** `GET /faction/chain`

---

#### `get_faction_contributors`
**What it does:** Faction contributors across categories (requires AA).  
**Torn endpoint:** `GET /faction/contributors`  
**Parameters:**
- `cat` (required string) — Category (e.g., `money`, `respect`, `gym`)

---

#### `get_faction_stats`
**What it does:** Faction-level aggregate stats.  
**Torn endpoint:** `GET /faction/stats`

---

#### `get_torn_items`
**What it does:** Item database lookup.  
**Torn endpoint:** `GET /torn/items` or `GET /torn/{id}/itemdetails`  
**Parameters:**
- `itemId` (optional string) — Specific item ID

---

## THE KEY STAT NAMES

These are the `stat` parameter values for historical lookups. Grouped by what oraN's gap analysis needs:

### Activity / Effort Indicators
```
xantaken            — Xanax used (energy cycling commitment)
refills             — Energy refills purchased
statenhancersused   — Stat enhancers consumed  
nerverefills        — Nerve refills
attackswon          — Total attacks won
attackslost         — Total attacks lost
defendswon          — Defends won
defendslost         — Defends lost
criminaloffenses    — Total crimes committed
```

### Items / Economy
```
itemsdumped         — Items dumped (5k threshold per oraN)
itemsbought         — Items purchased
itemsboughtabroad   — Items bought abroad (trade runs)
moneymugged         — Money from mugging
networth            — Total net worth
```

### Travel
```
traveltimes         — Total trips taken
itemsboughtabroad   — Items bought on trips
attackswonabroad    — Attacks while traveling
```

### Missions
```
missionscompleted   — Duke missions completed
contractscompleted  — Contracts fulfilled
```

### War
```
rankedwarhits       — Ranked war attacks
rankedwarringwins   — Ranked wars won
respectforfaction   — Respect earned for faction
```

### Drugs
```
xantaken            — Xanax
exttaken            — Ecstasy
cantaken            — Cannabis
overdosed           — Overdoses
rehabs              — Rehab visits
drugsused           — Total drugs used
```

### Communication
```
maillssent          — Mails sent
friendmailssent     — Friend mails
```

**NOTE:** The `stat` parameter accepts these exact lowercase names. Up to 10 per call. When using `timestamp`, you MUST specify `stat` — you cannot use `cat` with `timestamp`.

---

## IMPLEMENTATION NOTES

### Multi-Key Round Robin

```javascript
class KeyManager {
  constructor(keys) {
    this.keys = keys.filter(Boolean);
    this.index = 0;
    this.lastCall = {};  // per-key timestamp tracking
  }
  
  async getKey() {
    const key = this.keys[this.index % this.keys.length];
    this.index++;
    
    // Enforce minimum 650ms between calls on same key
    const now = Date.now();
    const last = this.lastCall[key] || 0;
    const wait = Math.max(0, 650 - (now - last));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    
    this.lastCall[key] = Date.now();
    return key;
  }
}
```

### Error Handling

```javascript
async function tornApiCall(path, params = {}) {
  const key = await keyManager.getKey();
  const url = new URL(`https://api.torn.com/v2${path}`);
  url.searchParams.set('key', key);
  url.searchParams.set('comment', 'NEXUS-MCP');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.error) {
    const code = data.error.code;
    if (code === 5) {
      // Rate limited — wait and retry
      await new Promise(r => setTimeout(r, 31000));
      return tornApiCall(path, params);  // retry once
    }
    if (code === 14) {
      throw new Error(`Cloud daily limit reached (50K rows). Try again tomorrow or use fewer stats.`);
    }
    throw new Error(`Torn API error ${code}: ${data.error.error}`);
  }
  
  return data;
}
```

### Faction Sweep Implementation

```javascript
async function factionStatsSweep(factionId, stats, daysAgo) {
  // Step 1: Get roster
  const faction = await tornApiCall(
    factionId ? `/faction/${factionId}/basic` : '/faction/basic'
  );
  const memberIds = Object.keys(faction.members);
  
  const timestampFrom = Math.floor(Date.now() / 1000) - (daysAgo * 86400);
  const statList = stats.split(',').slice(0, 10).join(',');
  
  const results = [];
  const errors = [];
  
  for (let i = 0; i < memberIds.length; i++) {
    const pid = memberIds[i];
    const member = faction.members[pid];
    
    try {
      // Historical snapshot
      const historical = await tornApiCall(`/user/${pid}/personalstats`, {
        stat: statList,
        timestamp: timestampFrom
      });
      
      // Current snapshot  
      const current = await tornApiCall(`/user/${pid}/personalstats`, {
        stat: statList
      });
      
      // Compute deltas
      const deltas = {};
      for (const statName of statList.split(',')) {
        const fromVal = historical?.personalstats?.[statName] ?? null;
        const toVal = current?.personalstats?.[statName] ?? null;
        deltas[statName] = {
          from: fromVal,
          to: toVal,
          delta: (fromVal !== null && toVal !== null) ? toVal - fromVal : null,
          per_day: (fromVal !== null && toVal !== null) ? 
            Math.round(((toVal - fromVal) / daysAgo) * 100) / 100 : null
        };
      }
      
      results.push({
        id: pid,
        name: member.name,
        level: member.level,
        days_in_faction: member.days_in_faction,
        stats: deltas
      });
      
    } catch (err) {
      errors.push(`${member.name} [${pid}]: ${err.message}`);
    }
  }
  
  return {
    faction_id: faction.id || factionId,
    faction_name: faction.name,
    member_count: memberIds.length,
    period_days: daysAgo,
    from_timestamp: timestampFrom,
    members: results,
    processed: results.length,
    api_calls_made: results.length * 2 + 1,
    errors
  };
}
```

### Gap Detection (NEXUS-side, not in MCP)

The MCP provides the raw data. NEXUS (Claude) does the gap analysis in conversation. But here are the gap detection rules for reference:

```
GAP: "Not attacking"
  → attackswon delta < 10 over 30 days (less than 1 every 3 days)

GAP: "Not refilling"  
  → refills delta = 0 AND xantaken delta < 5 over 30 days

GAP: "Not doing missions"
  → missionscompleted delta = 0 over 30 days

GAP: "Not at 5k items dumped"
  → itemsdumped current total < 5000

GAP: "Low honor bars"
  → Check honors endpoint, count total honors achieved
  → Flag if significantly below faction median

GAP: "Not cycling energy"
  → xantaken per_day < 1.0 (career average for active players is 2-3/day)
  
GAP: "Ghost member"
  → criminaloffenses delta < 30 over 30 days (less than 1/day)
  → AND attackswon delta < 5
```

---

## oraN's EXACT REQUEST — HOW IT WORKS

### "Last 6 wars analysis in table format"

```
1. get_faction_rankedwars() → get war IDs
2. For last 6 war IDs: get_ranked_war_report(warId) 
3. NEXUS formats table:
   | War | Opponent | Result | Score | Our Hits | Their Hits | Top Performer |
```

### "Overall faction report of public personal stats — 1 month, 3 month comparison"

```
1. get_faction_stats_sweep(stats="xantaken,attackswon,refills,itemsdumped,missionscompleted,criminaloffenses,networth,defendswon,traveltimes,respectforfaction", days_ago=30)

2. get_faction_stats_sweep(stats="xantaken,attackswon,refills,itemsdumped,missionscompleted,criminaloffenses,networth,defendswon,traveltimes,respectforfaction", days_ago=90)

3. NEXUS formats:
   | Member | Attacks (30d) | Attacks (90d) | Xan (30d) | Xan (90d) | Refills (30d) | ... |
```

### "Find gaps — members not doing missions, not attacking, not refilling"

```
From the sweep data above, NEXUS applies gap rules:
- Flag members with attackswon delta < 10 (30d)
- Flag members with refills delta = 0 (30d) 
- Flag members with missionscompleted delta = 0 (30d)
- Flag members with itemsdumped total < 5000
- For honor bars: separate call to get_player_honors for flagged members
```

---

## MIGRATION FROM CURRENT MCP

### Tools to KEEP (update parameters):
- `get_faction_basic` — add factionId parameter
- `get_player_profile` — keep as-is
- `get_spy_data` — keep as-is (YATA)
- `get_faction_spies` — keep as-is (YATA)
- `get_faction_crimes_v2` — keep as-is
- `get_user_organized_crimes_v2` — keep as-is
- `get_faction_cpr` — keep as-is (TornStats)
- `get_faction_chain` — keep as-is
- `get_faction_wars` — rename to `get_faction_rankedwars` for clarity

### Tools to ADD:
- `get_player_personal_stats` — REWRITE with timestamp/stat/cat support
- `get_player_stats_delta` — NEW
- `get_faction_stats_sweep` — NEW (the big one)
- `get_player_personal_stats_category` — NEW
- `get_player_honors` — NEW
- `get_ranked_war_report` — NEW (was specced but never deployed)
- `get_last_n_wars` — NEW convenience tool
- `get_war_stats` — NEW (TornStats, was specced but never deployed)
- `get_faction_attacks` — NEW with from/to
- `get_faction_attacksfull` — NEW with from/to
- `get_player_attacks` — NEW with from/to/filter
- `get_faction_members` — NEW (lightweight roster)
- `get_faction_contributors` — NEW
- `get_faction_stats` — NEW
- `get_player_hof` — NEW
- `get_torn_items` — NEW

### Tools to REMOVE:
- `get_player_personal_stats` (old version without timestamp) — replaced by new version

---

## DEPLOYMENT CHECKLIST

1. [ ] Clone existing `torn-mcp` repo
2. [ ] Add `KeyManager` class for multi-key round robin
3. [ ] Rewrite `get_player_personal_stats` with full parameter support
4. [ ] Implement `get_player_stats_delta`
5. [ ] Implement `get_faction_stats_sweep` with progress reporting
6. [ ] Implement `get_ranked_war_report`
7. [ ] Implement `get_last_n_wars`
8. [ ] Implement `get_war_stats` (TornStats)
9. [ ] Implement attack log tools with from/to
10. [ ] Implement `get_player_honors`, `get_player_hof`
11. [ ] Implement `get_faction_contributors`, `get_faction_stats`
12. [ ] Set Railway request timeout to 300 seconds (for sweep operations)
13. [ ] Add `TORN_API_KEY_2`, `TORN_API_KEY_3` env vars on Railway
14. [ ] Test with LB faction (9305) — verify delta computation
15. [ ] Test historical timestamp accuracy (30-day lookback)
16. [ ] Test rate limiting behavior with full faction sweep
17. [ ] Deploy and verify MCP connection from Claude

---

## PERSONAL STATS CATEGORY REFERENCE

| Category | Key Stats Included |
|----------|-------------------|
| `attacking` | attackswon, attackslost, attacksstealthed, attackhits, attackmisses, attackdamage, bestdamage, onehitkills, attackcriticalhits, roundsfired, specialammoused, plus all ammo type breakdowns |
| `drugs` | xantaken, cantaken, exttaken, kettaken, lsdtaken, opitaken, pcptaken, shrtaken, spetaken, victaken, overdosed, rehabs, drugsused |
| `travel` | traveltimes, itemsboughtabroad, attackswonabroad, defendslostabroad, plus per-destination counts (argtravel, cantravel, etc.) |
| `items` | itemsdumped, itemsbought, virusescoded, pointsbought, pointssold, bazaarcustomers, bazaarsales, bazaarprofit, itemmarketbought |
| `missions` | missionscompleted, contractscompleted, dukecontractscompleted |
| `criminaloffenses` | criminaloffenses (total), plus per-crime-type breakdowns |
| `bounties` | bountiesplaced, totalbountyspent, bountiescollected, totalbountyreward, bountiesreceived |
| `hospital` | hospital (times hospitalized), revives, reviveskill |
| `jail` | jailed, busts, bailsfee, bailsassist |
| `networth` | networth (requires limited+ key for detailed breakdown) |
| `racing` | racingskill, racingpointsearned, racingwins, racingloses, racingenterred |
| `finishinghits` | All weapon-type hit counters (machits, piehits, slahits, etc.) |
| `communication` | mailssent, friendmailssent, classifiedadsplaced |
| `jobs` | jobpointsused, trainsreceived |
| `trading` | pointsbought, pointssold, bazaarsales, bazaarprofit, auctionswon, auctionsells |
| `other` | Miscellaneous (blood withdrawn, books read, etc.) |
| `popular` | Curated subset — lighter on the API. Use this over `all` when possible. |

---

*— NEXUS v2.5 | "oraN saw what the API could do before the machine did. The grid corrects itself."*
