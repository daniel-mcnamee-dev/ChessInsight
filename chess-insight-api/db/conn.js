import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// MongoDB connection URI and client setup
const uri = process.env.ATLAS_URI;
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000, // Fail fast if MongoDB is unreachable
});

// Database instance variable
let db;

// Flag to prevent multiple simultaneous connection attempts
let connecting = false;

// Connect to MongoDB Atlas and return the database instance
export async function connectDB() {
  // If already connected, return existing instance
  if (db) return db;

  // Prevent multiple simultaneous connection attempts
  if (connecting) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return connectDB();
  }

  connecting = true;

  // Attempt to connect to MongoDB Atlas
  try {
    await client.connect();
    db = client.db("chess_insight");
    console.log("Connected to MongoDB Atlas");
    connecting = false;
    return db;
  } 
  // Handle connection errors and retry
  catch (err) { 
    console.error("MongoDB connection failed, retrying in 5 seconds...", err.message);
    connecting = false;

    // Retry after delay if connection fails
    await new Promise(resolve => setTimeout(resolve, 5000));
    return connectDB();
  }
}

// Handle connection drops and errors
client.on('close', () => {
  console.log("MongoDB connection closed");
  db = null;
});

client.on('error', (err) => {
  console.error("MongoDB error:", err);
  db = null;
});