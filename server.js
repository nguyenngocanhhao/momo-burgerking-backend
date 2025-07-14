const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./db');


dotenv.config();
connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const userRoutes = require('./routes/user.route');
const productRoutes = require('./routes/product.route'); 
app.use('/users', userRoutes);
app.use('/api/products', productRoutes);

const promoRouter = require('./routes/promo.route');
app.use('/api/promo', promoRouter);

app.use(cors());
app.use(express.json());

 
const momoRoute = require('./routes/momo.route');
app.use('/api/payment', momoRoute);

const orderRoutes = require('./routes/order.route');
app.use('/orders', orderRoutes);
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server is running at http://localhost:${PORT}`));

