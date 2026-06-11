---
name: Knockout bracket two-leg architecture
description: How the CL/EL knockout data is paired into two-legged ties in live-knockout.ts
---

**Rule:** The knockout route (`live-knockout.ts`) pairs raw matches into `KnockoutTie` objects server-side. Never use `matches[]` on KnockoutRound — always use `ties[]`.

**Why:** football-data.org returns individual match fixtures, not grouped ties. Pairing must happen before sending to the frontend to avoid frontend complexity and ensure correct aggregate calculations.

**How to apply:**
- Sort matches by date (ascending) within each stage; earliest = leg 1.
- Find return leg: `m2.homeTeam.id === m1.awayTeam.id && m2.awayTeam.id === m1.homeTeam.id`.
- teamA = home team in leg1. teamAGoals = leg1.homeScore + leg2.awayScore.
- WC and Final are single-leg (no return leg found → leg2 = null).
- Winner determined only when aggregate is strictly unequal (equal → ET/Pens → winnerId null).
- Bracket connectors only drawn between rounds with a strict 2:1 tie count ratio.
- PLAYOFFS (8 ties) and LAST_16 (8 ties) in modern CL format have equal counts → no connector between them.
