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
const { filterBadWords } = require('./utils/badwords');

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

// Create themes directory if it doesn't exist
const themesDir = path.join(__dirname, 'uploads', 'themes');
if (!fs.existsSync(themesDir)) {
    fs.mkdirSync(themesDir, { recursive: true });
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

// Add multer configuration for group icon uploads
const groupIconStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const path = './uploads/group-icons';
        fs.mkdirSync(path, { recursive: true });
        cb(null, path);
    },
    filename: function (req, file, cb) {
        cb(null, 'group-' + Date.now() + path.extname(file.originalname));
    }
});

const uploadGroupIcon = multer({
    storage: groupIconStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173', 
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL || 'https://your-netlify-app.netlify.app'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://harsh:harsh@cluster0.vnoisag.mongodb.net/chatapp';

mongoose.connect(MONGODB_URI)
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

    jwt.verify(token, process.env.JWT_SECRET || 'a9bb101b21d7cf6c2701cff71eac8314eb7f5560d4cb5f358b34c7f1e4bd93aaa873adb5c569feb8a348e4ebfb609efe2f36ee8b7d98b7a57440876d6b571b7c', (err, decoded) => {
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

    jwt.verify(token, process.env.JWT_SECRET || 'a9bb101b21d7cf6c2701cff71eac8314eb7f5560d4cb5f358b34c7f1e4bd93aaa873adb5c569feb8a348e4ebfb609efe2f36ee8b7d98b7a57440876d6b571b7c', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Track connected users with their socket IDs
let connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        io.emit('active users', io.engine.clientsCount);
    });

    // Handle video call events
    socket.on('callUser', ({ userToCall, signalData, from, name }) => {
        io.to(userToCall).emit('callReceived', { signal: signalData, from, name });
    });

    socket.on('answerCall', (data) => {
        io.to(data.to).emit('callAccepted', data.signal);
    });

    socket.on('endCall', (data) => {
        io.to(data.to).emit('callEnded');
    });

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
            // Check for bad words in text messages
            if (messageData.type === 'text') {
                const { containsBadWord } = filterBadWords(messageData.text);
                if (containsBadWord) {
                    socket.emit('error', { message: 'Message contains inappropriate content' });
                    return;
                }
            }

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

    connectedUsers.set(socket.user.username, socket.id);
    io.emit('active users', connectedUsers.size);
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
            process.env.JWT_SECRET || 'a9bb101b21d7cf6c2701cff71eac8314eb7f5560d4cb5f358b34c7f1e4bd93aaa873adb5c569feb8a348e4ebfb609efe2f36ee8b7d98b7a57440876d6b571b7c',
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
            process.env.JWT_SECRET || 'a9bb101b21d7cf6c2701cff71eac8314eb7f5560d4cb5f358b34c7f1e4bd93aaa873adb5c569feb8a348e4ebfb609efe2f36ee8b7d98b7a57440876d6b571b7c',
            { expiresIn: '1h' }
        );

        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Image upload endpoint
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        res.json({ 
            message: 'File uploaded successfully',
            url: `uploads/${req.file.filename}`
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});

// Group settings routes
app.put('/api/group/name', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Group name cannot be empty' });
        }

        // In a real application, you would update the group name in the database
        // For this example, we'll just broadcast the change to all clients
        io.emit('group update', { type: 'name', name: name.trim() });
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating group name:', error);
        res.status(500).json({ error: 'Failed to update group name' });
    }
});

app.put('/api/group/icon', authenticateToken, uploadGroupIcon.single('icon'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const iconUrl = req.file.path.replace(/\\/g, '/');
        
        // In a real application, you would update the group icon in the database
        // For this example, we'll just broadcast the change to all clients
        io.emit('group update', { type: 'icon', url: iconUrl });
        res.json({ url: iconUrl });
    } catch (error) {
        console.error('Error updating group icon:', error);
        res.status(500).json({ error: 'Failed to update group icon' });
    }
});

// Theme routes
app.get('/api/themes', authenticateToken, (req, res) => {
    try {
        const themesPath = path.join(__dirname, 'uploads', 'themes');
        // Create themes directory if it doesn't exist
        if (!fs.existsSync(themesPath)) {
            fs.mkdirSync(themesPath, { recursive: true });
        }

        const files = fs.readdirSync(themesPath)
            .filter(file => file.match(/\.(jpg|jpeg|png)$/i))
            .map(file => ({
                path: `uploads/themes/${file}`,
                thumbnail: `uploads/themes/${file}`
            }));

        res.json({ themes: files });
    } catch (error) {
        console.error('Error loading themes:', error);
        res.status(500).json({ error: 'Failed to load themes' });
    }
});

app.get('/api/themes/current', authenticateToken, (req, res) => {
    try {
        // In a real application, you would fetch this from a database
        // For now, we'll return null to indicate no theme is set
        res.json({ theme: null });
    } catch (error) {
        console.error('Error fetching current theme:', error);
        res.status(500).json({ error: 'Failed to fetch current theme' });
    }
});

app.put('/api/themes/current', authenticateToken, (req, res) => {
    try {
        const { theme } = req.body;
        if (!theme) {
            return res.status(400).json({ error: 'Theme path is required' });
        }

        // Validate that the theme exists
        const themePath = path.join(__dirname, theme);
        if (!fs.existsSync(themePath)) {
            return res.status(404).json({ error: 'Theme not found' });
        }

        // In a real application, you would save this to a database
        // For now, we'll just broadcast the change to all clients
        io.emit('theme update', theme);
        res.json({ success: true, theme });
    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).json({ error: 'Failed to update theme' });
    }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
