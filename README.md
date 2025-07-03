# 🚀 Free Rooms - Real-Time Chat Application

A modern, real-time chat application built with React and Firebase that allows users to create, join, and manage chat rooms with advanced messaging features.

![React](https://img.shields.io/badge/React-19.1.0-blue)
![Firebase](https://img.shields.io/badge/Firebase-11.9.1-orange)
![Redux](https://img.shields.io/badge/Redux_Toolkit-2.8.2-purple)
![Vite](https://img.shields.io/badge/Vite-6.3.5-green)

## ✨ Features

### 🔐 Authentication
- **Email/Password Authentication** - Secure user registration and login
- **Google OAuth** - Quick sign-in with Google account
- **User Profiles** - Display names, avatars, and profile management
- **Session Persistence** - Remembers your login state

### 💬 Chat Rooms
- **Create Rooms** - Start new chat rooms with custom names and descriptions
- **Join Rooms** - Browse and join existing public rooms
- **Room Management** - Admin controls for room settings and member management
- **Member Roles** - Admin and member role system with different permissions
- **Room Deletion** - Admins can delete rooms (with confirmation)

### 📱 Real-Time Messaging
- **Instant Messaging** - Real-time message delivery using Firebase Firestore
- **Message Editing** - Edit your own messages after sending
- **Message Deletion** - Delete individual messages or bulk delete
- **Message Selection** - Multi-select messages with keyboard shortcuts
- **Copy Messages** - Copy selected messages to clipboard
- **Rich Text Input** - Paste formatting and emoji support
- **Typing Indicators** - See when other users are typing

### 🎨 User Interface
- **Dark/Light Theme** - Toggle between dark and light modes
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Modern UI** - Clean, intuitive interface with smooth animations
- **Loading States** - Elegant loading animations and feedback
- **User Avatars** - Profile pictures and avatar placeholders
- **Member Lists** - View room members with their roles

### 🔧 Advanced Features
- **Unread Message Counts** - Badge indicators for unread messages
- **Session Recovery** - Automatically restores your last selected room
- **File Attachments** - Upload and share files using Firebase Storage
- **Member Management** - Kick users, change roles (admin only)
- **Keyboard Shortcuts** - Efficient navigation and actions
- **Settings Panel** - User preferences and account settings
- **Notification System** - Toast notifications for actions and errors

## 🛠️ Tech Stack

### Frontend
- **React 19** - Latest React with modern features
- **Redux Toolkit** - Efficient state management
- **React Router DOM** - Client-side routing
- **React Firebase Hooks** - Firebase integration hooks

### Backend
- **Firebase Authentication** - User management and authentication
- **Firebase Firestore** - Real-time NoSQL database
- **Firebase Storage** - File storage and management

### Development Tools
- **Vite** - Lightning-fast build tool and dev server
- **ESLint** - Code linting and formatting
- **CSS Modules** - Scoped styling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Firebase project setup

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-react-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password and Google)
   - Create a Firestore database
   - Set up Firebase Storage
   - Update `src/firebase.js` with your Firebase config

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173`
   - The app will automatically reload as you make changes

## 📚 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── ChatApp.jsx      # Main chat application
│   ├── RoomList.jsx     # Room list and management
│   ├── RoomChat.jsx     # Chat interface
│   └── Settings.jsx     # User settings
├── context/             # React context providers
│   └── ThemeContext.jsx # Theme management
├── store/              # Redux store
│   ├── authSlice.js    # Authentication state
│   └── store.js        # Store configuration
├── SignIn.jsx          # Authentication components
├── SignUp.jsx
├── firebase.js         # Firebase configuration
└── App.jsx            # Main app component
```

## 🎯 Key Features Explained

### Room Management
- **Create Room**: Users can create new rooms with names and descriptions
- **Join Room**: Browse and join existing rooms
- **Member Management**: Admins can manage room members and permissions
- **Role System**: Different permissions for admins and regular members

### Message Features
- **Real-time Updates**: Messages appear instantly across all connected clients
- **Message History**: Persistent message storage with Firestore
- **Message Actions**: Edit, delete, copy, and select multiple messages
- **Keyboard Shortcuts**: 
  - `Escape` - Cancel selection or go back
  - `Delete` - Delete selected messages
  - `Ctrl/Cmd + C` - Copy selected messages

### User Experience
- **Session Persistence**: Automatically remembers your last active room
- **Unread Indicators**: Visual badges show unread message counts
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Theme Toggle**: Switch between light and dark modes

## 🔑 Environment Variables

Create a `.env` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Firebase team for the backend infrastructure
- Vite team for the excellent build tool
- All contributors and users of this project

---

**Built with ❤️ using React and Firebase**
