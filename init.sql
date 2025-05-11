CREATE TABLE notes (
    node_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL
);

INSERT INTO notes (node_id, name, status) VALUES
('1', 'Love Note', 'active'),
('2', 'Reminder', 'inactive'),
('3', 'Meeting Note', 'active');