const express = require('express');
const axios = require('axios');
const router = express.Router();

const PRODUCT_URL = 'https://s3.amazonaws.com/roxiler.com/product_transaction.json';

// Function to fetch product data from the URL
async function fetchProductData() {
    try {
        const response = await axios.get(PRODUCT_URL);
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

// Helper function to filter transactions by month
function filterByMonth(transactions, month) {
    return transactions.filter(transaction => {
        const transactionMonth = new Date(transaction.dateOfSale).getMonth();
        return transactionMonth === (month - 1); // month is 0-based in JS
    });
}

// Function to get price range counts
function getPriceRangeCounts(transactions) {
    const priceRanges = {
        'Under $50': 0,
        '$50 - $100': 0,
        '$101 - $200': 0,
        '$201 - $500': 0,
        'Over $500': 0
    };

    transactions.forEach(transaction => {
        const price = transaction.price;
        if (price < 50) {
            priceRanges['Under $50']++;
        } else if (price >= 50 && price <= 100) {
            priceRanges['$50 - $100']++;
        } else if (price > 100 && price <= 200) {
            priceRanges['$101 - $200']++;
        } else if (price > 200 && price <= 500) {
            priceRanges['$201 - $500']++;
        } else {
            priceRanges['Over $500']++;
        }
    });

    return priceRanges;
}

// Helper function to filter transactions by date range
function filterByDateRange(transactions, startDate, endDate) {
    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.dateOfSale);
        return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
    });
}

// GET API for listing transactions with search and pagination
router.get('/products', async (req, res) => {
    const { search = '', month = 3, page = 1, perPage = 10 } = req.query;
    const data = await fetchProductData();

    // Filter transactions for the selected month
    let filteredData = filterByMonth(data, month);

    // Filter by search query
    filteredData = filteredData.filter(product => {
        return (
            product.title.toLowerCase().includes(search.toLowerCase()) ||
            product.description.toLowerCase().includes(search.toLowerCase()) ||
            product.price.toString().includes(search)
        );
    });

    // Pagination logic
    const start = (page - 1) * perPage;
    const paginatedData = filteredData.slice(start, start + perPage);

    res.status(200).json({
        currentPage: parseInt(page),
        perPage: parseInt(perPage),
        totalRecords: filteredData.length,
        data: paginatedData
    });
});


// GET API for listing transactions with search and pagination
router.get('/allproducts', async (req, res) => {
    const { search = '', month = 'all', page = 1, perPage = 10 } = req.query; // Change default month to 'all'
    const data = await fetchProductData();

    // If 'all' is selected for month, we will not filter by month
    let filteredData = month === 'all' ? data : filterByMonth(data, month);

    // Filter by search query
    filteredData = filteredData.filter(product => {
        return (
            product.title.toLowerCase().includes(search.toLowerCase()) ||
            product.description.toLowerCase().includes(search.toLowerCase()) ||
            product.price.toString().includes(search)
        );
    });

    // Pagination logic
    const start = (page - 1) * perPage;
    const paginatedData = filteredData.slice(start, start + perPage);

    res.status(200).json({
        currentPage: parseInt(page),
        perPage: parseInt(perPage),
        totalRecords: filteredData.length,
        data: paginatedData
    });
});


// New API for getting transactions by month and date range
router.get('/products/month-date', async (req, res) => {
    const { month, startDate, endDate, search = '', page = 1, perPage = 10 } = req.query;
    const data = await fetchProductData();

    // Filter by month
    let filteredData = filterByMonth(data, month);

    // Filter by date range if provided
    if (startDate && endDate) {
        filteredData = filterByDateRange(filteredData, startDate, endDate);
    }

    // Filter by search query if provided
    filteredData = filteredData.filter(product => {
        const { title, description, price } = product;
        return (
            title.toLowerCase().includes(search.toLowerCase()) ||
            description.toLowerCase().includes(search.toLowerCase()) ||
            price.toString().includes(search)
        );
    });

    // Pagination logic
    const start = (page - 1) * perPage;
    const paginatedData = filteredData.slice(start, start + perPage);

    res.status(200).json({
        currentPage: parseInt(page),
        perPage: parseInt(perPage),
        totalRecords: filteredData.length,
        data: paginatedData
    });
});

// Existing GET API for statistics of a selected month
router.get('/statistics', async (req, res) => {
    const { month, startDate, endDate } = req.query;

    console.log("Received Month:", month); 
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    if (!month) {
        return res.status(400).json({ message: 'Month is required' });
    }

    const data = await fetchProductData();
    let transactions = filterByMonth(data, month);
    
    // Apply date range filtering if provided
    if (startDate && endDate) {
        transactions = filterByDateRange(transactions, startDate, endDate);
    }

    console.log("Filtered Transactions:", transactions);

    const totalSaleAmount = transactions.reduce((total, item) => item.sold ? total + item.price : total, 0);
    const totalSoldItems = transactions.filter(item => item.sold).length;
    const totalNotSoldItems = transactions.filter(item => !item.sold).length;

    res.status(200).json({
        month,
        totalSaleAmount,
        totalSoldItems,
        totalNotSoldItems
    });
});


router.get('/bar-chart', async (req, res) => {
    const { month } = req.query;

    if (!month) {
        return res.status(400).json({ message: 'Month is required' });
    }

    const data = await fetchProductData();
    const transactions = filterByMonth(data, month);

    // Get price range counts
    const priceRangeCounts = getPriceRangeCounts(transactions);

    res.status(200).json({
        month,
        priceRanges: priceRangeCounts
    });
});

// ... other existing APIs remain unchanged

module.exports = router;
