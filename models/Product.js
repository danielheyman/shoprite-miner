var Product = new mongoose.Schema({
    store: {type: String, required: true},
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
    sku: String,
    sale_until: Date
}, {
    toJSON: { virtuals: true }
});

Product.index({ store: 1, sku: 1 }, { unique: true });

Product.virtual('nutrition', {
    ref: 'Nutrition',
    localField: 'sku',
    foreignField: 'sku',
    justOne: true
});

module.exports = mongoose.model('Product', Product);
