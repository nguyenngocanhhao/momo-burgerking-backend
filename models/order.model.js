const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: String,
  orderId: String,
  address: String,
  method: String,
  isPaid: Boolean,
  createdAt: Date,
 items: [
  {
    product: {
      id: String,
      name: String,
      price: Number
    },
    quantity: Number,
    options: [
      {
        category: String,
        name: String,
        price: Number
      }
    ]
  }
]

});

module.exports = mongoose.model('Order', orderSchema);
