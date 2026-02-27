const { Router } = require("express");
const ctrl = require("../controllers/productController");

const router = Router();

// Aggregation / stats routes — must be defined BEFORE /:id routes
router.get("/stats/summary",  ctrl.getStats);
router.get("/stats/top-rated", ctrl.getTopRated);

// CRUD
router.post("/",              ctrl.create);
router.get("/",               ctrl.list);
router.get("/:id",            ctrl.get);
router.put("/:id",            ctrl.update);
router.delete("/:id",         ctrl.delete);

// Nested sub-resources
router.post("/:id/reviews",   ctrl.addReview);    // Add review to product
router.patch("/:id/stock",    ctrl.updateStock);  // Update variant stock

module.exports = router;
