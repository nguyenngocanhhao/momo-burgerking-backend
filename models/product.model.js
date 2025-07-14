const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  image: String,
  category: String,
  tags: [String],
  rating: Number,
  available: Boolean,
});

module.exports = mongoose.model('Product', productSchema);

