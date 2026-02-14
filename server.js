const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🔥 ডাটাবেজ কানেক্ট হয়েছে সফলভাবে!"))
    .catch(err => console.error("❌ ডাটাবেজ এরর:", err.message));

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: "Email already exists!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "Registration Successful!" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Wrong Password!" });

        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET || 'secret123', 
            { expiresIn: '30d' } 
        );
        res.json({ message: "Login Successful!", token });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

app.post('/send-payment', async (req, res) => {
    const { name, email, course, price, method, trxid } = req.body;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `New Enrollment Request: ${course}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #a855f7;">
                <h2 style="color: #a855f7;">নতুন কোর্স এনরোলমেন্ট রিকোয়েস্ট</h2>
                <p><strong>ছাত্রের নাম:</strong> ${name}</p>
                <p><strong>ইমেইল:</strong> ${email}</p>
                <p><strong>কোর্স:</strong> ${course}</p>
                <p><strong>টাকার পরিমাণ:</strong> ${price} BDT</p>
                <p><strong>পেমেন্ট মেথড:</strong> ${method}</p>
                <p><strong>Transaction ID:</strong> ${trxid}</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Request sent successfully!" });
    } catch (error) {
        console.error("Email Error:", error);
        res.status(500).json({ success: false, error: "Failed to send email." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 সার্ভার চলছে পোর্ট ${PORT}-এ`));
