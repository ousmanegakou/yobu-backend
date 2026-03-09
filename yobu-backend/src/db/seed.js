require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./index");

async function seed() {
  try {
    console.log("🌱 Seeding YOBU database...");

    // Admin
    const adminHash = await bcrypt.hash("admin123", 12);
    await db.query(
      `INSERT INTO admins (name, email, password_hash) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      ["YOBU Admin", "admin@yobu.com", adminHash]
    );

    // Merchants
    const merchants = [
      { name: "UrbanGlow Cosmetics",  email: "urbanglow@yobu.com",  category: "Cosmetics & Beauty", plan: "premium" },
      { name: "TechZone Electronics", email: "techzone@yobu.com",   category: "Electronics",        plan: "standard" },
      { name: "AfriMarket Grocery",   email: "afrimarket@yobu.com", category: "Grocery",            plan: "starter" },
      { name: "StyleHouse Boutique",  email: "stylehouse@yobu.com", category: "Fashion",            plan: "standard" },
    ];
    for (const m of merchants) {
      const hash = await bcrypt.hash("merchant123", 12);
      await db.query(
        `INSERT INTO merchants (name, email, password_hash, category, plan) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [m.name, m.email, hash, m.category, m.plan]
      );
    }

    // Drivers
    const drivers = [
      { name: "Marcus Johnson", email: "marcus@yobu.com",  phone: "+15551234567", vehicle: "Toyota Corolla", plate: "NYC-4821" },
      { name: "Sofia Martinez",  email: "sofia@yobu.com",   phone: "+15559876543", vehicle: "Honda Civic",    plate: "NYC-7364" },
      { name: "Liam Chen",       email: "liam@yobu.com",    phone: "+15556543210", vehicle: "Ford Focus",     plate: "NYC-2958" },
    ];
    for (const d of drivers) {
      const hash = await bcrypt.hash("driver123", 12);
      await db.query(
        `INSERT INTO drivers (name, email, password_hash, phone, vehicle, plate) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [d.name, d.email, hash, d.phone, d.vehicle, d.plate]
      );
    }

    console.log("✅ Seed data inserted successfully.");
    console.log("   Admin:    admin@yobu.com / admin123");
    console.log("   Merchant: urbanglow@yobu.com / merchant123");
    console.log("   Driver:   marcus@yobu.com / driver123");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
