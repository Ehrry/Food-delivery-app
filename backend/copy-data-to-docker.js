import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

// Source: Your local database (where test.js gets data from)
const sourcePool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "restaurant", // Change this if your local database has a different name
  password: "ehrry",
  port: 5432, // Local PostgreSQL port
});

// Destination: Docker PostgreSQL
const destPool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "restaurant",
  password: "ehrry",
  port: 5435, // Docker PostgreSQL external port
});

async function copyData() {
  try {
    console.log("🔄 Starting data copy from local DB to Docker DB...");

    // Fetch products from local database
    console.log("📥 Fetching products from local database (localhost:5432)...");
    const sourceResult = await sourcePool.query("SELECT * FROM products ORDER BY id ASC");
    console.log(`✅ Found ${sourceResult.rows.length} products in local database`);

    if (sourceResult.rows.length === 0) {
      console.log("⚠️  No products found in local database");
      return;
    }

    // Clear existing products in Docker (optional)
    console.log("🗑️  Clearing existing products in Docker database...");
    await destPool.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");

    // Insert products into Docker database
    console.log("📤 Inserting products into Docker database (localhost:5435)...");
    let inserted = 0;

    for (const product of sourceResult.rows) {
      await destPool.query(
        `INSERT INTO products (id, name, description, price, image_url, category)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           image_url = EXCLUDED.image_url,
           category = EXCLUDED.category`,
        [
          product.id,
          product.name,
          product.description,
          product.price,
          product.image_url,
          product.category || null,
        ]
      );
      inserted++;
    }

    console.log(`✅ Successfully copied ${inserted} products to Docker database!`);

    // Verify
    const verifyResult = await destPool.query("SELECT COUNT(*) as count FROM products");
    console.log(`✅ Verification: ${verifyResult.rows[0].count} products in Docker database`);

  } catch (err) {
    console.error("❌ Copy failed:", err.message);
    if (err.code === '3D000') {
      console.error("💡 Tip: Make sure your local database name is correct.");
      console.error("   Current: 'restaurant'");
      console.error("   If different, update the 'database' field in sourcePool configuration.");
    }
    console.error("Full error:", err);
  } finally {
    await sourcePool.end();
    await destPool.end();
  }
}

copyData();
