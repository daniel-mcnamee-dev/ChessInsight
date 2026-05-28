import express from "express";
import { connectDB } from "../db/conn.js";

const router = express.Router();

// Add recently viewed game
router.post("/", async (req, res) => {
  const game = req.body;

  if (!game || !game.pgn) {
    return res.status(400).json({ error: "Game data required" });
  }

  try {
    const db = await connectDB();
    const collection = db.collection("recent_games");

    // Remove if already exists (avoid duplicates)
    await collection.deleteOne({ pgn: game.pgn });

    // Insert as newest
    await collection.insertOne({
      ...game,
      viewedAt: new Date()
    });

    // Keep only last 12
    const count = await collection.countDocuments();
    if (count > 12) {
      const oldest = await collection
        .find({})
        .sort({ viewedAt: 1 })
        .limit(count - 12)
        .toArray();

      for (let g of oldest) {
        await collection.deleteOne({ _id: g._id });
      }
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get recent games
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("recent_games");

    const games = await collection
      .find({})
      .sort({ viewedAt: -1 })
      .toArray();

    res.json(games);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;