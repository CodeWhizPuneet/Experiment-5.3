const Product = require("../models/Product");
const mongoose = require("mongoose");

// ── Helper ────────────────────────────────────────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── CREATE product ─────────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const product = new Product(req.body);
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    const messages = err.errors
      ? Object.values(err.errors).map((e) => e.message)
      : [err.message];
    res.status(400).json({ message: "Validation failed", details: messages });
  }
};

// ── LIST all products ──────────────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let filter = {};

    if (category) filter.category = { $regex: category, $options: "i" };
    if (search) filter.$text = { $search: search };

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
};

// ── GET single product ─────────────────────────────────────────────────────────
exports.get = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid ID format" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (err) {
    next(err);
  }
};

// ── UPDATE product ─────────────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid ID format" });

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (err) {
    next(err);
  }
};

// ── DELETE product ─────────────────────────────────────────────────────────────
exports.delete = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid ID format" });

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ── ADD review ────────────────────────────────────────────────────────────────
// POST /api/products/:id/reviews
exports.addReview = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid ID format" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.reviews.push(req.body);
    await product.save(); // pre-save hook recalculates avgRating automatically

    res.status(201).json(product);
  } catch (err) {
    const messages = err.errors
      ? Object.values(err.errors).map((e) => e.message)
      : [err.message];
    res.status(400).json({ message: "Validation failed", details: messages });
  }
};

// ── UPDATE variant stock ──────────────────────────────────────────────────────
// PATCH /api/products/:id/stock
// Body: { "sku": "HP-BL-001", "quantity": -2 }  (negative = reduce, positive = add)
exports.updateStock = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid ID format" });

    const { sku, quantity } = req.body;
    if (!sku || quantity === undefined)
      return res.status(400).json({ message: "sku and quantity are required" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.updateVariantStock(sku, quantity); // instance method
    await product.save();

    res.json({ message: "Stock updated", product });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ── AGGREGATION: summary stats ────────────────────────────────────────────────
// GET /api/products/stats/summary
exports.getStats = async (req, res, next) => {
  try {
    const stats = await Product.aggregate([
      {
        // Unwind variants to compute per-variant stats
        $unwind: { path: "$variants", preserveNullAndEmpty: true },
      },
      {
        $group: {
          _id: "$category",
          totalProducts: { $addToSet: "$_id" },
          totalStock: { $sum: "$variants.stock" },
          avgPrice: { $avg: "$variants.price" },
          minPrice: { $min: "$variants.price" },
          maxPrice: { $max: "$variants.price" },
          avgRating: { $avg: "$avgRating" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalProducts: { $size: "$totalProducts" },
          totalStock: 1,
          avgPrice: { $round: ["$avgPrice", 2] },
          minPrice: 1,
          maxPrice: 1,
          avgRating: { $round: ["$avgRating", 2] },
        },
      },
      { $sort: { category: 1 } },
    ]);

    res.json(stats);
  } catch (err) {
    next(err);
  }
};

// ── AGGREGATION: top rated ────────────────────────────────────────────────────
// GET /api/products/stats/top-rated
exports.getTopRated = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const products = await Product.find({ reviews: { $exists: true, $ne: [] } })
      .sort({ avgRating: -1 })
      .limit(limit)
      .select("name category avgRating totalStock");

    res.json(products);
  } catch (err) {
    next(err);
  }
};
