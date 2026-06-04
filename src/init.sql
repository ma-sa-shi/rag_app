CREATE DATABASE IF NOT EXISTS db CHARACTER SET utf8mb4 COLLATE utf8mb4_ja_0900_as_cs_ks;
CREATE DATABASE IF NOT EXISTS db_test CHARACTER SET utf8mb4 COLLATE utf8mb4_ja_0900_as_cs_ks;

GRANT SELECT, INSERT, UPDATE, DELETE ON db.* TO 'user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON db_test.* TO 'user'@'%';
FLUSH PRIVILEGES;

USE db;

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    delete_flg BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_ja_0900_as_cs_ks;

CREATE TABLE IF NOT EXISTS docs (
    doc_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    dir_path VARCHAR(255),
    filename VARCHAR(100) NOT NULL,
    status ENUM('uploaded', 'processing', 'ingested', 'failed') DEFAULT 'uploaded',
    extracted_text MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    delete_flg BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_ja_0900_as_cs_ks;

ALTER TABLE users ADD INDEX idx_username (username);
ALTER TABLE docs ADD INDEX idx_user_id (user_id);
ALTER TABLE docs ADD INDEX idx_status (status);

USE db_test;

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    delete_flg BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_ja_0900_as_cs_ks;

CREATE TABLE IF NOT EXISTS docs (
    doc_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    dir_path VARCHAR(255),
    filename VARCHAR(100) NOT NULL,
    status ENUM('uploaded', 'processing', 'ingested', 'failed') DEFAULT 'uploaded',
    extracted_text MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    delete_flg BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_ja_0900_as_cs_ks;

ALTER TABLE users ADD INDEX idx_username (username);
ALTER TABLE docs ADD INDEX idx_user_id (user_id);
ALTER TABLE docs ADD INDEX idx_status (status);
