

CREATE DATABASE IF NOT EXISTS queuesmart;
USE queuesmart;

-- Stores login and authentication information.
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user'
);

-- Stores profile information.
-- Email references the unique email in Users.
CREATE TABLE IF NOT EXISTS UserProfile (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    CONSTRAINT fk_userprofile_email
        FOREIGN KEY (email)
        REFERENCES Users(email)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
