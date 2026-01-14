import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_URL = process.env.API_URL || "http://localhost:5000";
const PRODUCTS_FILE = process.argv[2] || join(__dirname, "products.json");

async function bulkInsertProducts() {
  try {
    // Read products from JSON file
    console.log(`Reading products from: ${PRODUCTS_FILE}`);
    const fileContent = fs.readFileSync(PRODUCTS_FILE, "utf8");
    const products = JSON.parse(fileContent);

    if (!Array.isArray(products)) {
      throw new Error("Products file must contain a JSON array");
    }

    if (products.length === 0) {
      throw new Error("Products array is empty");
    }

    console.log(`Found ${products.length} products to insert`);

    // Post to bulk endpoint
    console.log(`Posting to ${API_URL}/products/bulk...`);
    const response = await fetch(`${API_URL}/products/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(products),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || result.message || "Failed to insert products"
      );
    }

    console.log("\n✅ Success!");
    console.log(`Created ${result.count} products`);
    console.log("\nFirst few products:");
    result.products.slice(0, 3).forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - $${product.price}`);
    });
    if (result.products.length > 3) {
      console.log(`  ... and ${result.products.length - 3} more`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.code === "ENOENT") {
      console.error(`File not found: ${PRODUCTS_FILE}`);
      console.error(
        "\nUsage: node bulk-insert-products.js [path-to-products.json]"
      );
      console.error("Or create a products.json file in the backend directory");
    } else if (error.code === "ECONNREFUSED") {
      console.error(
        "Could not connect to server. Make sure the server is running on",
        API_URL
      );
    }
    process.exit(1);
  }
}

bulkInsertProducts();
