import express from "express";
import cors from "cors";
import { Pool } from "pg";

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "products table",
  password: "ehrry",
  port: 5432,
});

// ----- Serve Images Folder -----
app.use("/images", express.static("images"));

// ----- GET: Fetch All Products -----
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
