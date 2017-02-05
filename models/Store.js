var Store = mongoose.Schema({
    name: String,
    shoprite_id: String,
});

module.exports = mongoose.model('Store', Store);
