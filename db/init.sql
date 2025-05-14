-- CREATE TABLE notes (
--     node_id VARCHAR(50) PRIMARY KEY,
--     name VARCHAR(100) NOT NULL,
--     status VARCHAR(50) NOT NULL
-- );

-- INSERT INTO notes (node_id, name, status) VALUES
-- ('1', 'Love Note', 'active'),
-- ('2', 'Reminder', 'inactive'),
-- ('3', 'Meeting Note', 'active');

-- ตารางผู้ใช้งาน
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,  -- เก็บรหัสผ่านที่เข้ารหัสแล้ว
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตารางโน้ต (อัพเดตจากของเดิมให้ผูกกับผู้ใช้)
CREATE TABLE notes (
    note_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ตารางไลก์
CREATE TABLE likes (
    like_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    note_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, note_id),  -- ผู้ใช้หนึ่งคนไลก์ note หนึ่งครั้งเท่านั้น
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (note_id) REFERENCES notes(note_id)
);

-- ตารางแจ้งเตือน
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
