import express from "express";
import { connectDB } from "../db/conn.js";

const router = express.Router();

// Save searched username
router.post("/search", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  try {
    const db = await connectDB();
    const collection = db.collection("searched_players");

    // Update timestamp if username already exists, otherwise insert
    await collection.updateOne(
      { username: username.toLowerCase() },
      { $set: { searchedAt: new Date() } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get recent searches (for autocomplete)
router.get("/search", async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("searched_players");

    const results = await collection
      .find({})
      .sort({ searchedAt: -1 })
      .limit(10)
      .toArray();

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;