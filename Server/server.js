const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS configuration
app.use(cors());
app.use(express.json());

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// MongoDB connection
mongoose.connect('mongodb+srv://harsh:harsh@cluster0.vnoisag.mongodb.net/chatapp')
.then(() => {
    console.log('✅ MongoDB connected successfully');
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Socket authentication middleware
const authenticateSocket = (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, process.env.JWT_SECRET || '23456789oiuhgfde45yuiopojhgfe56iojbvfde456789oijhb', (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.user = decoded;
        next();
    });
};

io.use(authenticateSocket);

// Authentication middleware for protected routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || '23456789oiuhgfde45yuiopojhgfe56iojbvfde456789oijhb', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Image upload endpoint
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const imageUrl = `http://localhost:5001/uploads/${req.file.filename}`;
        res.json({ url: imageUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});

// Track connected users
let connectedUsers = new Set();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}`);
    connectedUsers.add(socket.user.username);
    io.emit('active users', connectedUsers.size);
    
    // Load existing messages
    Message.find()
        .sort({ timestamp: -1 })
        .limit(150)
        .then(messages => {
            socket.emit('load messages', messages.reverse());
        })
        .catch(err => console.error('Error loading messages:', err));

    // Handle new messages
    socket.on('chat message', async (messageData) => {
        try {
            const message = new Message({
                text: messageData.text,
                username: socket.user.username,
                timestamp: new Date(),
                type: messageData.type || 'text',
                url: messageData.url
            });
            
            const savedMessage = await message.save();
            
            io.emit('chat message', {
                _id: savedMessage._id,
                text: savedMessage.text,
                username: savedMessage.username,
                timestamp: savedMessage.timestamp,
                type: savedMessage.type,
                url: savedMessage.url
            });
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('error', { message: 'Error sending message' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.username}`);
        connectedUsers.delete(socket.user.username);
        io.emit('active users', connectedUsers.size);
    });
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.status(400).json({
                error: existingUser.email === email ? 'Email already exists' : 'Username already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, username, password: hashedPassword });
        await user.save();

        const token = jwt.sign(
            { id: user._id, username, email },
            process.env.JWT_SECRET || '23456789oiuhgfde45yuiopojhgfe56iojbvfde456789oijhb',
            { expiresIn: '1h' }
        );
        
        res.status(201).json({ message: 'User registered', token, username });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, email },
            process.env.JWT_SECRET || '23456789oiuhgfde45yuiopojhgfe56iojbvfde456789oijhb',
            { expiresIn: '1h' }
        );

        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});