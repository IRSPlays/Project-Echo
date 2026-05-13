import { initDb } from "./connection.js";

// Standalone script to initialize the database
console.log("[Echo] Initializing database...");
initDb();
console.log("[Echo] Database ready.");
