require("dotenv").config();
const express = require("express");
const connectDB = require("./src/config/db");
const productRoutes = require("./src/routes/productRoutes");

const app = express();

// Middleware
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "E-commerce Catalog API is running",
    endpoints: [
      "POST   /api/products              — Create product",
      "GET    /api/products              — List all products",
      "GET    /api/products/:id          — Get product by ID",
      "PUT    /api/products/:id          — Update product",
      "DELETE /api/products/:id          — Delete product",
      "POST   /api/products/:id/reviews  — Add review",
      "PATCH  /api/products/:id/stock    — Update variant stock",
      "GET    /api/products/stats/summary — Aggregation stats",
    ],
  });
});

// Routes
app.use("/api/products", productRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
