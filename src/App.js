import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ChatPage from './pages/ChatPage';
import UserDashboard from './components/UserDashboard';
import EmbedChat from './components/EmbedChat';
import './styles/global.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        // Add API call to verify existing session
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/admin" /> : <Login onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/admin" 
            element={
              user ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/chat/:projectId" 
            element={
              user ? <ChatPage /> : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/user/dashboard" 
            element={
              user ? <UserDashboard /> : <Navigate to="/login" />
            } 
          />
          <Route 
            path="/embed/:projectId" 
            element={<EmbedChat />} 
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
