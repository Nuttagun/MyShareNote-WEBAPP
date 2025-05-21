import React, { useEffect, useState } from "react";

interface Notification {
  notification_id: number;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Props {
  userId: string;
}

const NotificationBell: React.FC<Props> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  console.log("NotificationBell userId =", userId);


  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = () => {
      fetch(`http://localhost:5004/api/notifications/${userId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Notifications from API:", data.notifications);
          setNotifications(data.notifications);
        })
        .catch(console.error);
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 10000); // รีเฟรชทุก 10 วิ

    return () => clearInterval(interval);
  }, [userId]);


  const unreadCount = notifications.filter(n => !n.is_read).length;
  console.log("Current notifications state:", notifications);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setShowDropdown(!showDropdown)} style={{ fontSize: '35px' }}>
        🔔
        {unreadCount > 0 && (
          <span style={{ color: "red", fontWeight: "bold", fontSize: '10px' }}>{unreadCount}</span>
        )}
      </button>

    {showDropdown && (
        <div style={{
            position: "absolute",
            right: 0,
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
            maxHeight: "300px",
            overflowY: "auto",
            width: "320px",
            zIndex: 1000,
            padding: "8px 0",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}>
            {notifications.length === 0 && (
              <p style={{ textAlign: "center", color: "#999", margin: "16px 0" }}>
                  No notifications
              </p>
            )}
            {notifications.map(n => (
              <div
                  key={n.notification_id}
                  style={{
                  padding: "12px 20px",
                  backgroundColor: n.is_read ? "#fff" : "#f0f8ff",
                  borderRadius: "8px",
                  margin: "8px 12px",
                  boxShadow: n.is_read ? "none" : "0 2px 8px rgba(0, 120, 215, 0.1)",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={e => {(e.currentTarget as HTMLElement).style.backgroundColor = "#e6f2ff";}}
                  onMouseLeave={e => {(e.currentTarget as HTMLElement).style.backgroundColor = n.is_read ? "#fff" : "#f0f8ff";}}
              >
                <div style={{ fontWeight: n.is_read ? "normal" : "600", color: "#222", fontSize: "14px", marginBottom: "6px" }}>
                  {n.message}
                </div>
                <small style={{ color: "#666", fontSize: "12px" }}>
                  {new Date(n.created_at).toLocaleString()}
                </small>
              </div>
            ))}
        </div>
    )}

    </div>
  );
};

export default NotificationBell;
