require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("./index");

async function migrate() {
  try {
    console.log("🚀 Running YOBU database migrations...");
    const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await db.query(sql);
    console.log("✅ Database schema created successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
