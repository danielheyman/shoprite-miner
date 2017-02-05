var Product = new mongoose.Schema({
    store: {type: String, required: true},
    category_id: String,
    category_name: String,
    aisle: String,
    brand: String,
    current_price: String,
    current_unit_price: String,
    description: String,
    id: String,
    item_type: String,
    name: String,
    regular_price: String,
    size: String,
    sku: String
});

Product.index({ store: 1, category_id: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', Product);
