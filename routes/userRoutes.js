const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Signup API                                                                           
router.post('/signup', async (req, res) => {
    const { phone, email, name, dob, monthlySalary, password } = req.body;

    // Validate user age
    const age = Math.floor((new Date() - new Date(dob).getTime()) / 3.15576e+10);
    if (age < 20) return res.status(400).send('User must be above 20 years of age');

    // Validate monthly salary
    if (monthlySalary < 25000) return res.status(400).send('Monthly salary must be 25k or more');

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save user
    const user = new User({
        phone,
        email,
        name,
        dob,
        monthlySalary,
        password: hashedPassword,
        status: 'Approved',
        purchasePower: 0
    });

    try {
        await user.save();
        res.status(201).send('User registered successfully');
    } catch (error) {
        console.error('Error registering user:', error.message); // Log error details
        res.status(400).send('Error registering user');
    }
});
module.exports = router;


// Login API
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid email or password');

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send('Invalid email or password');

    // Generate JWT
    const token = jwt.sign({ _id: user._id }, 'secretKey', { expiresIn: '1h' });
    res.header('auth-token', token).send(token);
});
module.exports = router;

// Show User Data API
router.get('/user', async (req, res) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).send('Access denied');

    try {
        const verified = jwt.verify(token, 'secretKey');
        const user = await User.findById(verified._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(400).send('Invalid token');
    }
});
module.exports = router;

// Borrow Money API
router.post('/borrow', async (req, res) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).send('Access denied');

    try {
        const verified = jwt.verify(token, 'secretKey');
        const { amount } = req.body;

        const user = await User.findById(verified._id);
        user.purchasePower += amount;

        // Calculate monthly repayment amount
        const interestRate = 0.08;
        const tenure = 12; // Assuming 12 months for repayment
        const monthlyRepayment = (amount * (1 + interestRate)) / tenure;

        await user.save();
        res.json({ purchasePower: user.purchasePower, monthlyRepayment });
    } catch (error) {
        res.status(400).send('Invalid token');
    }
});
module.exports = router;
