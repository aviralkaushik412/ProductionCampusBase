# Real-time Chat Application

A real-time chat application built with React, Node.js, Express, Socket.IO, and MongoDB.

## Features

- Real-time messaging
- User authentication (register/login)
- Image sharing
- Bad words filtering
- Active users count
- Read receipts
- Responsive design

## Deployment Instructions

### Backend Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the following settings:
   - Name: chat-app-backend
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. Add the following environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string for JWT signing
   - `FRONTEND_URL`: Your Netlify frontend URL
5. Deploy the service

### Frontend Deployment (Netlify)

1. Create a new site on Netlify
2. Connect your GitHub repository
3. Configure the following settings:
   - Base directory: Frontend
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add the following environment variable:
   - `VITE_BACKEND_URL`: Your Render backend URL
5. Deploy the site

## Local Development

### Backend

1. Navigate to the Server directory:
   ```
   cd Server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=5001
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_jwt_secret_key
   FRONTEND_URL=http://localhost:5173
   ```

4. Start the server:
   ```
   npm start
   ```

### Frontend

1. Navigate to the Frontend directory:
   ```
   cd Frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following variable:
   ```
   VITE_BACKEND_URL=http://localhost:5001
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## Technologies Used

- React
- Node.js
- Express
- Socket.IO
- MongoDB
- JWT Authentication
- Vite
- React Router
- React Icons
- React Toastify 