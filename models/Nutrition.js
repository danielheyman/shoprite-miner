var Nutrition = new mongoose.Schema({
    sku: {type: String, unique: true},
    serving_size: String,
    serving_count: Number,
    calories: Number,
    calories_from_fat: Number,
    fat: Number,
    saturated_fat: Number,
    polyunsaturated_fat: Number,
    monounsaturated_fat: Number,
    trans_fat: Number,
    cholesterol: Number,
    sodium: Number,
    carb: Number,
    dietary_fiber: Number,
    sugar: Number,
    protein: Number,
    vitamin_a: Number,
    vitamin_c: Number,
    vitamin_d: Number,
    calcium: Number,
    iron: Number,
    ingredients: [String],
    directions: String
});

module.exports = mongoose.model('Nutrition', Nutrition);
