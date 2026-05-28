import express from "express";
import { connectDB } from "../db/conn.js";

const router = express.Router();

// Save or update move note
router.post("/", async (req, res) => {
  const { pgn, moveNumber, note, game } = req.body;

  try {
    const db = await connectDB();

    // Save move note
    await db.collection("move_notes").updateOne(
      { pgn, moveNumber },
      { $set: { note, updatedAt: new Date() } },
      { upsert: true }
    );

    // Ensure game exists in annotated_games
    await db.collection("annotated_games").updateOne(
    { pgn },
    {
        $set: {
        white: game.white,
        black: game.black,
        whiteResult: game.whiteResult,
        blackResult: game.blackResult,
        date: game.date
        },
        $setOnInsert: {
        pgn: game.pgn,
        annotatedAt: new Date()
        }
    },
    { upsert: true }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Get all annotated games (for listing)
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("annotated_games");

    const games = await collection
      .find({})
      .sort({ annotatedAt: -1 })
      .toArray();

    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get notes for a game
router.get("/:pgn", async (req, res) => {
  const { pgn } = req.params;

  try {
    const db = await connectDB();
    const collection = db.collection("move_notes");

    const notes = await collection.find({ pgn }).toArray();

    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;