

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

-- ===========================================================
-- Part 6: Notification / History
-- Both tables point at Users(email), the same way UserProfile
-- does, so a record always belongs to a registered user.
-- ===========================================================

-- Tracks system activity: what the app told the user and when.
CREATE TABLE IF NOT EXISTS Notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    message VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('sent', 'viewed') NOT NULL DEFAULT 'sent',
    CONSTRAINT fk_notification_email
        FOREIGN KEY (email)
        REFERENCES Users(email)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Keeps every queue a user already finished.
CREATE TABLE IF NOT EXISTS QueueHistory (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    wait_minutes INT NOT NULL DEFAULT 0,
    outcome ENUM('Served', 'Left queue') NOT NULL,
    completed_at DATE NOT NULL,
    CONSTRAINT fk_queuehistory_email
        FOREIGN KEY (email)
        REFERENCES Users(email)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Both screens look rows up by email. InnoDB already builds an
-- index for a foreign key column, so those lookups are covered
-- and we do not add one by hand.
