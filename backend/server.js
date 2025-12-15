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

app.post("/cart/add", async (req, res) => {
  const { product_id, quantity } = req.body;

  try {
    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "Invalid product or quantity" });
    }

    // Global cart ID = 1
    const cart_id = 1;

    // Get product price from products table
    const product = await pool.query(
      "SELECT price FROM products WHERE id = $1",
      [product_id]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const price = product.rows[0].price;

    // Check if product already exists in cart_items
    const existing = await pool.query(
      "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cart_id, product_id]
    );

    if (existing.rows.length > 0) {
      // Update quantity (price & total_price auto-update)
      await pool.query(
        "UPDATE cart_items SET quantity = quantity + $1 WHERE cart_id = $2 AND product_id = $3",
        [quantity, cart_id, product_id]
      );

      return res.json({ message: "Cart updated (quantity increased)" });
    }

    // Insert new item
    await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity, price)
       VALUES ($1, $2, $3, $4)`,
      [cart_id, product_id, quantity, price]
    );

    res.json({ message: "Item added to cart" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/cart", async (req, res) => {
  try {
    const cart_id = 1; // global cart

    const cartItems = await pool.query(
      `SELECT 
          cart_items.id,
          cart_items.product_id,
          cart_items.quantity,
          cart_items.price,
          cart_items.total_price,
          products.name,
          products.description,
          products.image_url
       FROM cart_items
       JOIN products ON cart_items.product_id = products.id
       WHERE cart_items.cart_id = $1
       ORDER BY cart_items.id ASC`,
      [cart_id]
    );

    res.json(cartItems.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.delete("/cart/:productId", async (req, res) => {
  try {
    const cart_id = 1;
    const product_id = parseInt(req.params.productId, 10);

    if (Number.isNaN(product_id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const existing = await pool.query(
      "SELECT id FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cart_id, product_id]
    );

    if (existing.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Item not found in cart for removal" });
    }

    await pool.query(
      "DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cart_id, product_id]
    );

    res.json({ message: "Item removed from cart" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.patch("/cart/:productId/decrement", async (req, res) => {
  try {
    const cart_id = 1;
    const product_id = parseInt(req.params.productId, 10);

    if (Number.isNaN(product_id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const existing = await pool.query(
      "SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cart_id, product_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    const currentQty = existing.rows[0].quantity;

    if (currentQty <= 1) {
      await pool.query(
        "DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2",
        [cart_id, product_id]
      );
      return res.json({ message: "Item removed from cart" });
    }

    await pool.query(
      "UPDATE cart_items SET quantity = quantity - 1 WHERE cart_id = $1 AND product_id = $2",
      [cart_id, product_id]
    );

    res.json({ message: "Item quantity decremented" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
