const mongoose = require("mongoose");
const { Schema } = mongoose;

// ─── Nested: Variant Schema ───────────────────────────────────────────────────
// Each product can have multiple variants (e.g. different colors/sizes)
const variantSchema = new Schema({
  sku: {
    type: String,
    required: [true, "SKU is required"],
    trim: true,
  },
  color: {
    type: String,
    trim: true,
  },
  size: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, "Variant price is required"],
    min: [0, "Price cannot be negative"],
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, "Stock cannot be negative"],
  },
});

// ─── Nested: Review Schema ────────────────────────────────────────────────────
// Each product can have multiple user reviews
const reviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "userId is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ─── Main: Product Schema ─────────────────────────────────────────────────────
const productSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      // Index for filtering by category
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    // Embedded nested arrays
    variants: [variantSchema],
    reviews: [reviewSchema],

    // Computed field — updated whenever a review is added/removed
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // Total stock across all variants (updated by instance method)
    totalStock: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Compound index: speeds up searches by name + category
productSchema.index({ name: 1, category: 1 });
// Text index: enables full-text search on name and description
productSchema.index({ name: "text", description: "text" });

// ─── Instance Method: recalculateStats ────────────────────────────────────────
// Updates avgRating and totalStock dynamically from embedded arrays
productSchema.methods.recalculateStats = function () {
  // Average rating
  if (this.reviews.length > 0) {
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
    this.avgRating = parseFloat((sum / this.reviews.length).toFixed(2));
  } else {
    this.avgRating = 0;
  }

  // Total stock from all variants
  this.totalStock = this.variants.reduce((acc, v) => acc + v.stock, 0);
};

// ─── Instance Method: updateVariantStock ─────────────────────────────────────
// Updates stock of a specific variant by SKU
productSchema.methods.updateVariantStock = function (sku, quantity) {
  const variant = this.variants.find((v) => v.sku === sku);
  if (!variant) throw new Error(`Variant with SKU "${sku}" not found`);
  if (variant.stock + quantity < 0)
    throw new Error("Insufficient stock for this operation");
  variant.stock += quantity;
  this.recalculateStats();
};

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
// Auto-recalculate stats before every save
productSchema.pre("save", function (next) {
  this.recalculateStats();
  next();
});

module.exports = mongoose.model("Product", productSchema);
