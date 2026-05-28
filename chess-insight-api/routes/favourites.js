import express from "express";
import { connectDB } from "../db/conn.js";

const router = express.Router();

// Save favourite game
router.post("/toggle", async (req, res) => {
  const game = req.body;

  if (!game || !game.pgn) {
    return res.status(400).json({ error: "Game data required" });
  }

  try {
    const db = await connectDB();
    const collection = db.collection("favourite_games");

    // Check if already saved
    const existing = await collection.findOne({
      pgn: game.pgn
    });

    if (existing) {
      // Remove favourite
      await collection.deleteOne({ _id: existing._id });
      return res.json({ favourited: false });
    } else {
      // Add favourite
      await collection.insertOne({
        ...game,
        savedAt: new Date()
      });
      return res.json({ favourited: true });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get favourite games
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("favourite_games");

    const games = await collection
      .find({})
      .sort({ savedAt: -1 })
      .toArray();

    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;