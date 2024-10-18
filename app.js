const express = require('express');
const app = express();
const cors = require('cors');
const port = 5000;



// Import the products router
const productsRouter = require('./Routes');
app.use(cors()); // Enable CORS for all routes
// Use the products router for handling API requests
app.use('/api', productsRouter);

app.get('/api/allproducts', async (req, res) => {
    const { month, search, page = 1, perPage = 10 } = req.query;

    try {
        let query = {};

        // If month is defined, filter by month
        if (month) {
            query.dateOfSale = {
                $gte: new Date(`2024-${month}-01`), // Adjust to your date format
                $lt: new Date(`2024-${month + 1}-01`),
            };
        }

        // If search is defined, add search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { price: { $regex: search, $options: 'i' } },
            ];
        }

        // Fetching the data from the database
        const transactions = await Transaction.find(query)
            .skip((page - 1) * perPage)
            .limit(perPage);

        const totalRecords = await Transaction.countDocuments(query);

        res.json({ data: transactions, totalRecords });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Error fetching transactions' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
