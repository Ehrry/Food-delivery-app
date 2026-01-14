import { Pool } from "pg";
import dotenv from "dotenv";
import express from "express";
const app = express();
dotenv.config();
const pool = new Pool({
  user: process.env.POSTGRES_USER || "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB || "restaurant",
  password: process.env.POSTGRES_PASSWORD || "ehrry",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
});

app.get("/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching products:", err.message);
    console.error("Full error:", err);
  }
});
app.listen(6000, () => {
  console.log("Server is running on port 6000");
});
