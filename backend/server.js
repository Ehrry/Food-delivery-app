import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PostgreSQL Connection
const pool = new Pool({
  user: process.env.POSTGRES_USER || "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB || "restaurant",
  password: process.env.POSTGRES_PASSWORD || "ehrry",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
});

// Handle connection errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Track if schema is initialized
let schemaInitialized = false;

// Ensure all database tables exist before handling requests
const ensureDatabaseSchema = async () => {
  try {
    // Test database connection first
    await pool.query("SELECT 1");
    console.log("✓ Database connection successful");

    // Create products table (required for /products endpoint)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC(10,2) NOT NULL,
        image_url TEXT,
        category VARCHAR(100)
      );
    `);

    // Add category column if it doesn't exist (for existing tables)
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
    `);

    console.log("✓ Products table ready");

    // Create cart_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        cart_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price NUMERIC(10,2) NOT NULL,
        total_price NUMERIC(10,2) GENERATED ALWAYS AS (quantity * price) STORED,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    console.log("✓ Cart items table ready");

    // Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        cart_id INTEGER NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip TEXT NOT NULL,
        country TEXT NOT NULL,
        phone TEXT NOT NULL,
        subtotal NUMERIC(10,2) NOT NULL,
        delivery_fee NUMERIC(10,2) NOT NULL,
        total NUMERIC(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✓ Orders table ready");

    // Create order_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        total_price NUMERIC(10,2) NOT NULL
      );
    `);
    console.log("✓ Order items table ready");

    console.log("✓ Database schema initialized successfully");
    schemaInitialized = true;
  } catch (err) {
    console.error("✗ Failed to initialize database schema:", err.message);
    console.error("Full error:", err);
    schemaInitialized = false;
    throw err;
  }
};

// Middleware to ensure schema exists before handling requests
const ensureSchemaMiddleware = async (req, res, next) => {
  if (!schemaInitialized) {
    try {
      await ensureDatabaseSchema();
      next();
    } catch (err) {
      console.error("Schema initialization failed in middleware:", err.message);
      return res.status(500).json({
        error: "Database Error",
        message: "Failed to initialize database schema",
        details: err.message,
      });
    }
  } else {
    next();
  }
};

// ----- Serve Images Folder -----

app.use("/images", express.static("images"));

// ----- Health Check Route (before schema middleware) -----
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      schema: schemaInitialized ? "initialized" : "not initialized",
    });
  } catch (err) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: err.message,
    });
  }
});

// Apply schema middleware to all routes that need database
app.use(ensureSchemaMiddleware);

// ----- GET: Fetch All Products -----
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching products:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// ----- POST: Create New Product -----
app.post("/products", async (req, res) => {
  const { name, description, price, image_url, category } = req.body;

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
      `INSERT INTO products (name, description, price, image_url, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, price, image_url, category || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating product:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// ----- POST: Bulk Create Products -----
app.post("/products/bulk", async (req, res) => {
  const products = req.body;

  try {
    // Validate that products is an array
    if (!Array.isArray(products)) {
      return res.status(400).json({
        error: "Request body must be an array of products",
      });
    }

    if (products.length === 0) {
      return res.status(400).json({
        error: "Products array cannot be empty",
      });
    }

    // Validate all products before inserting
    for (let i = 0; i < products.length; i++) {
      const { name, description, price, image_url, category } = products[i];

      if (!name || !description || price === undefined || !image_url) {
        return res.status(400).json({
          error: `Product at index ${i} is missing required fields: name, description, price, image_url`,
        });
      }

      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          error: `Product at index ${i} has invalid price: price must be a valid positive number`,
        });
      }
    }

    // Use a transaction for bulk insert
    await pool.query("BEGIN");

    try {
      // Build bulk insert query using VALUES with multiple rows
      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      for (const product of products) {
        const row = [];
        row.push(`$${paramIndex++}`); // name
        values.push(product.name);
        row.push(`$${paramIndex++}`); // description
        values.push(product.description);
        row.push(`$${paramIndex++}`); // price
        values.push(product.price);
        row.push(`$${paramIndex++}`); // image_url
        values.push(product.image_url);
        row.push(`$${paramIndex++}`); // category
        values.push(product.category || null);

        placeholders.push(`(${row.join(", ")})`);
      }

      const query = `
        INSERT INTO products (name, description, price, image_url, category)
        VALUES ${placeholders.join(", ")}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      await pool.query("COMMIT");

      res.status(201).json({
        message: `Successfully created ${result.rows.length} products`,
        count: result.rows.length,
        products: result.rows,
      });
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Error bulk creating products:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// ----- PATCH: Update Product -----
app.patch("/products/:id", async (req, res) => {
  try {
    const product_id = parseInt(req.params.id, 10);

    if (Number.isNaN(product_id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const { name, description, price, image_url, category } = req.body;

    // Check if product exists
    const existing = await pool.query("SELECT id FROM products WHERE id = $1", [
      product_id,
    ]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Validate that at least one field is provided
    if (
      !name &&
      !description &&
      price === undefined &&
      !image_url &&
      category === undefined
    ) {
      return res.status(400).json({
        error:
          "At least one field (name, description, price, image_url, category) must be provided",
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
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
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
    console.error("Error updating product:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
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
    console.error("Error deleting product:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
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
    console.error("Error adding to cart:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
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
    console.error("Error fetching cart:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
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
    console.error("Error removing from cart:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
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
    console.error("Error decrementing cart item:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
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
    console.error("Error fetching orders:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
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
    console.error("Error placing order:", err.message);
    console.error("Full error:", err);
    res.status(500).json({
      error: "Server Error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// Start server after ensuring database schema is ready
const startServer = async () => {
  try {
    // Ensure schema is initialized before starting server
    await ensureDatabaseSchema();

    app.listen(5000, () => {
      console.log("✓ Server running on port 5000");
      console.log("✓ Ready to accept requests");
    });
  } catch (err) {
    console.error("✗ Failed to start server:", err.message);
    // Still start the server - schema will be created on next request
    app.listen(5000, () => {
      console.log(
        "⚠ Server running on port 5000 (schema initialization failed)"
      );
      console.log("⚠ Will retry schema creation on first request");
    });
  }
};

startServer();
