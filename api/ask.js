// This runs on Vercel's server, not in the user's browser.
// It talks to the free, open World Cup 2026 data API (worldcup26.ir)
// and turns a plain-English question into a real match answer.

const BASE_URL = "https://worldcup26.ir";

// A dedicated free account just for this app to use the data API.
// (This API requires any account to be logged in — these credentials
// don't protect anything valuable, they just unlock the free data.)
const EMAIL = "worldcupcompanion.hackathon@example.com";
const PASSWORD = "WorldCupCompanion2026!";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Please include a question." });
  }

  try {
    const token = await getToken();
    if (!token) {
      return res.status(500).json({
        error: "Couldn't connect to the World Cup data source right now.",
      });
    }

    const gamesRes = await fetch(`${BASE_URL}/get/games`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!gamesRes.ok) {
      return res.status(500).json({
        error: "The World Cup data source didn't respond as expected.",
      });
    }

    const gamesData = await gamesRes.json();
    const games = gamesData.games || [];

    const match = findMatch(question, games);

    if (!match) {
      return res.status(200).json({
        answer:
          'I couldn\'t find a match for those teams. Try something like "score of Brazil vs Morocco".',
      });
    }

    return res.status(200).json({ answer: describeMatch(match) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong on our end." });
  }
}

// Logs in to get an access token. If the account doesn't exist yet
// (first time this app is ever used), it registers it automatically.
async function getToken() {
  let token = await login();
  if (!token) {
    await register();
    token = await login();
  }
  return token;
}

async function login() {
  try {
    const r = await fetch(`${BASE_URL}/auth/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.token || null;
  } catch {
    return null;
  }
}

async function register() {
  try {
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "World Cup Companion",
        email: EMAIL,
        password: PASSWORD,
      }),
    });
  } catch {
    // If registration fails because it already exists, login() above
    // will just work on the next call — nothing else to do here.
  }
}

// Looks for two team names from the question inside the match list.
function findMatch(question, games) {
  const q = question.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const g of games) {
    const home = (g.home_team_name_en || "").toLowerCase();
    const away = (g.away_team_name_en || "").toLowerCase();
    if (!home || !away) continue;

    let score = 0;
    if (q.includes(home)) score++;
    if (q.includes(away)) score++;

    if (score > bestScore) {
      bestScore = score;
      best = g;
    }
  }

  return bestScore >= 1 ? best : null;
}

// Turns raw match data into a plain-English answer.
function describeMatch(g) {
  const home = g.home_team_name_en || g.home_team_label || "TBD";
  const away = g.away_team_name_en || g.away_team_label || "TBD";
  const isFinished = g.finished === "TRUE" || g.finished === true;
  const isLive = g.time_elapsed && g.time_elapsed !== "notstarted" && !isFinished;

  if (!isFinished && !isLive) {
    return `${home} vs ${away} hasn't kicked off yet. Scheduled for ${g.local_date}.`;
  }

  const status = isFinished ? "Final" : `Live — ${g.time_elapsed}`;
  return `${home} ${g.home_score} - ${g.away_score} ${away}  (${status})`;
}
