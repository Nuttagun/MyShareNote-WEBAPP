import React, { useState, useEffect } from "react";
import { HeartOutlined, HeartFilled } from "@ant-design/icons";
import "./cute_like_button.css"; // Import the cute styles

const CuteLikeButton = ({ 
  isLiked, 
  likeCount, 
  onLikeToggle,
  disabled = false 
}) => {
  const [hearts, setHearts] = useState([]);
  
  // Create floating hearts animation when liked
  const createFloatingHearts = () => {
    if (!isLiked) return;
    
    const newHearts = [];
    for (let i = 0; i < 5; i++) {
      newHearts.push({
        id: Date.now() + i,
        left: Math.random() * 40 + 30, // Random position
        delay: Math.random() * 0.5
      });
    }
    
    setHearts([...hearts, ...newHearts]);
    
    // Remove hearts after animation completes
    setTimeout(() => {
      setHearts(prev => prev.filter(heart => !newHearts.find(h => h.id === heart.id)));
    }, 1500);
  };
  
  useEffect(() => {
    if (isLiked) {
      createFloatingHearts();
    }
  }, [isLiked]);
  
  return (
    <button 
      className={`like-button ${isLiked ? 'liked' : ''}`}
      onClick={onLikeToggle}
      disabled={disabled}
    >
      {isLiked ? <HeartFilled /> : <HeartOutlined />}
      <span>{isLiked ? 'Loved' : 'Love'}</span>
      <span className="like-count">{likeCount}</span>
      
      {/* Floating hearts animation */}
      {hearts.map(heart => (
        <span 
          key={heart.id}
          className="floating-heart"
          style={{
            left: `${heart.left}%`,
            animationDelay: `${heart.delay}s`
          }}
        >
          ❤️
        </span>
      ))}
    </button>
  );
};

export default CuteLikeButton;
