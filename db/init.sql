
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
    note_id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


CREATE TABLE likes (
    like_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    note_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, note_id),  
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (note_id) REFERENCES notes(note_id)
);

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

INSERT INTO users (user_id, username, email, password_hash) VALUES
('1', 'alice', 'alice@example.com', 'hashed_password_1'),
('2', 'bob', 'bob@example.com', 'hashed_password_2');

-- Insert โน้ต 3 รายการ ที่ผูกกับผู้ใช้ u001 และ u002
INSERT INTO notes (note_id, title, description, status, user_id) VALUES
('1', 'Note 1', 'Description for note 1', 'active', '1'),
('2', 'Note 2', 'Another note by Alice', 'archived', '2'),
('3', 'Note 3', 'Note by Bob', 'active', '2');