

CREATE DATABASE IF NOT EXISTS queuesmart;
USE queuesmart;




-- Stores login and authentication information.
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
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

-- =====================================================
-- Assignment 4 - Part 3: Service Table
-- =====================================================

CREATE TABLE IF NOT EXISTS services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    expected_duration_minutes INT NOT NULL,
    priority_level ENUM('low', 'medium', 'high') NOT NULL,

    CONSTRAINT chk_service_duration
        CHECK (expected_duration_minutes BETWEEN 1 AND 240),

    CONSTRAINT chk_service_name
        CHECK (CHAR_LENGTH(TRIM(name)) > 0),

    CONSTRAINT chk_service_description
        CHECK (CHAR_LENGTH(TRIM(description)) > 0)
);

-- ===========================================================
-- Part 4 and 5: Queue and QueueEntry
-- A queue belongs to a service, and an entry belongs to both a
-- queue and a user, so both links are foreign keys.
-- ===========================================================

-- One active line per service.
CREATE TABLE IF NOT EXISTS Queue (
    queue_id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_queue_service
        FOREIGN KEY (service_id)
        REFERENCES services(service_id)
        ON DELETE CASCADE
);

-- The people waiting in a queue.
-- position is written by the application, not by MySQL, because a
-- high priority entry goes in front of people who already joined,
-- so the numbers for that queue have to be set again.
CREATE TABLE IF NOT EXISTS QueueEntry (
    entry_id INT AUTO_INCREMENT PRIMARY KEY,
    queue_id INT NOT NULL,
    user_id INT NOT NULL,
    position INT NOT NULL,
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('waiting', 'served', 'canceled') NOT NULL DEFAULT 'waiting',
    CONSTRAINT fk_entry_queue
        FOREIGN KEY (queue_id)
        REFERENCES Queue(queue_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_entry_user
        FOREIGN KEY (user_id)
        REFERENCES Users(id)
        ON DELETE CASCADE
);

-- Stores admin information
INSERT INTO users (email, password, role)
VALUES ('123@user.com', '$2b$10$PjDxp2Hsy9q8THdmyCAbKeTsMnyjU365jrQVM8HBwi16.mWAmobdq', 'admin');

INSERT INTO UserProfile (full_name, email)
VALUES ('Alan Pourmo', '123@user.com');
