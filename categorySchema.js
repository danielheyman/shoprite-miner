var Category = new mongoose.Schema({
    store: {type: String, required: true},
    category_id: String,
    name: String,
    categories: [{
        category_id: String,
        name: String,
        has_subcategories: {type: Boolean, default: false},
        has_products: {type: Boolean, default: false},
    }]
});

Category.index({ store: 1, category_id: 1 }, { unique: true });

module.exports = mongoose.model('Category', Category);
