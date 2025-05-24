# Chat App

A full-stack real-time chat application built with **React**, **Vite**, **Node.js**, **Express**, **MongoDB**, **Socket.IO**, and **Cloudinary**.

---

## Features

- **Real-time messaging** (Socket.IO)
- **Text, image, message support**
- **Seen/blue tick functionality**
- **Message deletion for everyone**
- **Online user indicator**
- **User authentication (JWT)**
- **Profile pictures**
- **Responsive UI**
- **Token blacklisting with Redis (recommended- WIP)**
- **Image/video uploads via Cloudinary**

---

## Tech Stack

- **Frontend:** React, Vite, Zustand (state), Tailwind CSS
- **Backend:** Node.js, Express, MongoDB, Mongoose, Socket.IO
- **Media Storage:** Cloudinary
- **Authentication:** JWT
- **Real-time:** Socket.IO
- **Optional:** Redis (for token blacklisting, scaling, caching)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/chat-app.git
cd chat-app
```

### 2. Setup Backend

```bash
cd backend
npm install
```

- Create a `.env` file with your MongoDB, JWT, and Cloudinary credentials.

```env
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- Start the backend server:

```bash
npm run dev
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
npm run dev
```

- The frontend will run on [http://localhost:5173](http://localhost:5173)

---

## Usage

- Register or log in.
- Start a chat with any user.
- Send text, images, or videos.
- See real-time updates, online status, and message seen status.
- Delete messages for everyone within 1 hour.

---

## Folder Structure

```
backend/
  src/
    controllers/
    models/
    config/
    ...
frontend/
  src/
    components/
    pages/
    store/
    ...
```

---

## Future Improvements

- Settings page (under construction)
- Group chats
- Push notifications
- File sharing (PDF, docs, etc.)
- Improved security (rate limiting, helmet, etc.)
- Send video

---

## License

MIT

---

**Made by [Abhishek Singh Chauhan]**