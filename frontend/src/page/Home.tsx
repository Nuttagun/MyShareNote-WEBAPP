import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/auth');

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsername(payload.username || payload.name || payload.email); // รองรับหลายชื่อ field
      } catch (error) {
        localStorage.removeItem('token');
        navigate('/auth');
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('token_type');
    navigate('/auth');
  };

  return (
    <div className="home-container">
      <h1>🏡 Home</h1>
      <p>
        Welcome, <strong>{username}</strong>!
      </p>
      <button className="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default Home;
