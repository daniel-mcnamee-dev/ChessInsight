import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import "./db/conn.js";
import playersRoutes from "./routes/players.js";
import favouritesRoutes from "./routes/favourites.js";
import recentRoutes from "./routes/recent.js";
import moveNotesRoutes from "./routes/moveNotes.js";

// Load environment variables from .env file
dotenv.config();

// Create Express app and apply middleware
const app = express();
app.use(cors());
app.use(express.json());

// Use database routes
app.use("/db/players", playersRoutes);
app.use("/db/favourites", favouritesRoutes);
app.use("/db/recent", recentRoutes);
app.use("/db/move-notes", moveNotesRoutes);

const PORT = 3000;

// GET /api/player/:username
app.get("/api/player/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const response = await axios.get(
      `https://api.chess.com/pub/player/${username}`
    );

    const data = response.data;

    res.json({
      username: data.username,
      name: data.name,
      title: data.title,
      avatar: data.avatar,
      country: data.country?.split('/').pop(),
      joined: data.joined
    });
  } catch (error) {
    res.status(404).json({ error: "Player not found" });
  }
});

// GET /api/player/:username/stats
app.get("/api/player/:username/stats", async (req, res) => {
  const { username } = req.params;

  try {
    const response = await axios.get(
      `https://api.chess.com/pub/player/${username}/stats`
    );

    const stats = response.data;

    res.json({
      username,
      blitz: stats.chess_blitz?.last?.rating || null,
      rapid: stats.chess_rapid?.last?.rating || null,
      bullet: stats.chess_bullet?.last?.rating || null
    });
  } catch (error) {
    res.status(404).json({ error: "Stats not found" });
  }
});

// GET archives list
app.get("/api/player/:username/archives", async (req, res) => {
  const { username } = req.params;

  try {
    const response = await axios.get(
      `https://api.chess.com/pub/player/${username}/games/archives`
    );

    const archives = response.data.archives;

    const formatted = archives.map(url => {
      const parts = url.split('/');
      const year = parts[parts.length - 2];
      const month = parts[parts.length - 1];

      return {
        url,
        label: `${year}-${month}`
      };
    });

    res.json(formatted.reverse()); // newest first
  } catch (error) {
    res.status(404).json({ error: "Archives not found" });
  }
});

// Helper to extract opening name from PGN
function extractOpening(pgn) {
  const ecoMatch = pgn.match(/\[ECOUrl ".*\/(.*)"\]/);

  if (ecoMatch && ecoMatch[1]) {
    let opening = ecoMatch[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase());

    return opening;
  }

  return "Unknown Opening";
}

// GET games for specific archive
app.get("/api/archive", async (req, res) => {
  const { url, username } = req.query;

  try {
    const gamesRes = await axios.get(url);
    const games = gamesRes.data.games;

    const simplified = games.map(g => {
      const player = username.toLowerCase();
      const isWhite = g.white.username.toLowerCase() === player;
      const playerResult = isWhite ? g.white.result : g.black.result;

      let resultLabel = "Draw";
      if (playerResult === "win") resultLabel = "Win";
      else if (
        ["checkmated", "resigned", "timeout", "lose"].includes(playerResult)
      )
        resultLabel = "Loss";

      // Results for each side
      let whiteResult = "Draw";
      let blackResult = "Draw";

      if (g.white.result === "win") {
        whiteResult = "Win";
        blackResult = "Loss";
      } else if (g.black.result === "win") {
        whiteResult = "Loss";
        blackResult = "Win";
      }

      return {
        white: g.white.username,
        black: g.black.username,
        whiteRating: g.white.rating,
        blackRating: g.black.rating,
        result: resultLabel, // for games list
        whiteResult, // for game details
        blackResult, // for game details
        date: g.end_time,
        pgn: g.pgn,
        timeClass: g.time_class,
        opening: extractOpening(g.pgn)
      };
    });

    res.json(simplified);
  } catch (error) {
    res.status(404).json({ error: "Archive not found" });
  }
});


// Endpoint used to search for player username suggestions
app.get('/api/players/search/:query', async (req, res) => {

  // Convert the search query to lowercase so the match is not case sensitive
  const query = req.params.query.toLowerCase();

  try {

    // Request leaderboard data from API
    const response = await fetch('https://api.chess.com/pub/leaderboards');
    const data = await response.json();

    // Array to store usernames that match query
    const players = [];

    // Loop through leaderboard categories returned by the API
    Object.values(data).forEach(board => {

      // Each leaderboard contains a list of player objects
      board.forEach(player => {

        // Check if the player's username contains the search text
        if (player.username.toLowerCase().includes(query)) {

          // If it matches add the username to the results list
          players.push(player.username);
        
        }
      });
    });

    // Remove duplicate usernames and limit the results to ten suggestions
    const unique = [...new Set(players)].slice(0, 10);

    // Send the suggestions back to the frontend
    res.json(unique);

  } catch (err) {
    // If the request fails return an error
    res.status(500).json({ error: 'Search failed' });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});