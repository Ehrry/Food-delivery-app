import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Pool } from "pg";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PostgreSQL Connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "products table",
  password: "ehrry",
  port: 5432,
});

// // Ensure order tables exist before handling requests
// const ensureOrdersSchema = async () => {
//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS orders (
//       id SERIAL PRIMARY KEY,
//       cart_id INTEGER NOT NULL,
//       first_name TEXT NOT NULL,
//       last_name TEXT NOT NULL,
//       email TEXT NOT NULL,
//       address TEXT NOT NULL,
//       city TEXT NOT NULL,
//       state TEXT NOT NULL,
//       zip TEXT NOT NULL,
//       country TEXT NOT NULL,
//       phone TEXT NOT NULL,
//       subtotal NUMERIC(10,2) NOT NULL,
//       delivery_fee NUMERIC(10,2) NOT NULL,
//       total NUMERIC(10,2) NOT NULL,
//       status TEXT DEFAULT 'pending',
//       created_at TIMESTAMPTZ DEFAULT NOW()
//     );
//     CREATE TABLE IF NOT EXISTS order_items (
//       id SERIAL PRIMARY KEY,
//       order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
//       product_id INTEGER NOT NULL,
//       quantity INTEGER NOT NULL,
//       price NUMERIC(10,2) NOT NULL,
//       total_price NUMERIC(10,2) NOT NULL
//     );
//   `);
// };

// ensureOrdersSchema().catch((err) => {
//   console.error("Failed to ensure order tables", err);
// });

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

// ----- POST: Create New Product -----
app.post("/products", async (req, res) => {
  const { name, description, price, image_url } = req.body;

  try {
    if (!name || !description || price === undefined || !image_url) {
      return res.status(400).json({
        error: "Missing required fields: name, description, price, image_url",
      });
    }

    if (isNaN(price) || price < 0) {
      return res
        .status(400)
        .json({ error: "Price must be a valid positive number" });
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, price, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, price, image_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ----- PATCH: Update Product -----
app.patch("/products/:id", async (req, res) => {
  try {
    const product_id = parseInt(req.params.id, 10);

    if (Number.isNaN(product_id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const { name, description, price, image_url } = req.body;

    // Check if product exists
    const existing = await pool.query("SELECT id FROM products WHERE id = $1", [
      product_id,
    ]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Validate that at least one field is provided
    if (!name && !description && price === undefined && !image_url) {
      return res.status(400).json({
        error:
          "At least one field (name, description, price, image_url) must be provided",
      });
    }

    // Validate price if provided
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return res
        .status(400)
        .json({ error: "Price must be a valid positive number" });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      values.push(image_url);
    }

    values.push(product_id);

    const result = await pool.query(
      `UPDATE products 
       SET ${updates.join(", ")} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ----- DELETE: Delete Product -----
app.delete("/products/:id", async (req, res) => {
  try {
    const product_id = parseInt(req.params.id, 10);

    if (Number.isNaN(product_id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    // Check if product exists
    const existing = await pool.query("SELECT id FROM products WHERE id = $1", [
      product_id,
    ]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete the product
    await pool.query("DELETE FROM products WHERE id = $1", [product_id]);

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
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

// ----- GET: Fetch All Orders with Their Items -----
app.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.id,
         o.cart_id,
         o.first_name,
         o.last_name,
         o.email,
         o.address,
         o.city,
         o.state,
         o.zip,
         o.country,
         o.phone,
         o.subtotal,
         o.delivery_fee,
         o.total,
         o.status,
         o.created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', oi.id,
               'product_id', oi.product_id,
               'quantity', oi.quantity,
               'price', oi.price,
               'total_price', oi.total_price,
               'name', p.name,
               'description', p.description,
               'image_url', p.image_url
             )
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch orders:", err);
    res.status(500).send("Server Error");
  }
});

// ----- POST: Place Order from Cart -----
app.post("/orders", async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    address,
    city,
    state,
    zip,
    country,
    phone,
  } = req.body || {};

  if (
    !firstName ||
    !lastName ||
    !email ||
    !address ||
    !city ||
    !state ||
    !zip ||
    !country ||
    !phone
  ) {
    return res.status(400).json({ error: "Missing required customer details" });
  }

  const cart_id = 1;
  let transactionStarted = false;

  try {
    const cartItems = await pool.query(
      `SELECT product_id, quantity, price
       FROM cart_items
       WHERE cart_id = $1`,
      [cart_id]
    );

    if (cartItems.rows.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const subtotal = cartItems.rows.reduce(
      (acc, item) => acc + Number(item.price) * item.quantity,
      0
    );
    const deliveryFee = subtotal === 0 ? 0 : 2;
    const total = subtotal + deliveryFee;

    await pool.query("BEGIN");
    transactionStarted = true;

    const orderResult = await pool.query(
      `INSERT INTO orders
        (cart_id, first_name, last_name, email, address, city, state, zip, country, phone, subtotal, delivery_fee, total)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        cart_id,
        firstName,
        lastName,
        email,
        address,
        city,
        state,
        zip,
        country,
        phone,
        subtotal,
        deliveryFee,
        total,
      ]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of cartItems.rows) {
      const itemTotal = Number(item.price) * item.quantity;
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.quantity, item.price, itemTotal]
      );
    }

    await pool.query("DELETE FROM cart_items WHERE cart_id = $1", [cart_id]);
    await pool.query("COMMIT");

    res.status(201).json({
      orderId,
      subtotal,
      deliveryFee,
      total,
      message: "Order placed successfully",
    });
  } catch (err) {
    if (transactionStarted) {
      await pool.query("ROLLBACK");
    }
    console.error("Order placement failed:", err);
    res.status(500).send("Server Error");
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
