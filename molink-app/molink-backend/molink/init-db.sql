-- Molink 数据库初始化脚本
-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS molink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE molink_db;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(500),
    settings TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 工作空间表
CREATE TABLE IF NOT EXISTS workspaces (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id CHAR(36) NOT NULL,
    icon VARCHAR(100),
    settings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_workspaces_owner (owner_id),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 页面表
CREATE TABLE IF NOT EXISTS pages (
    id CHAR(36) PRIMARY KEY,
    workspace_id CHAR(36) NOT NULL,
    parent_id CHAR(36),
    title VARCHAR(500) NOT NULL DEFAULT '无标题',
    page_type ENUM('page', 'database') DEFAULT 'page',
    icon VARCHAR(100),
    cover_image VARCHAR(500),
    is_favorite BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    position INT DEFAULT 0,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pages_workspace (workspace_id),
    INDEX idx_pages_parent (parent_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 内容块表
CREATE TABLE IF NOT EXISTS blocks (
    id CHAR(36) PRIMARY KEY,
    page_id CHAR(36) NOT NULL,
    parent_block_id CHAR(36),
    block_type ENUM('text', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'image', 'code', 'quote', 'table') DEFAULT 'text',
    content TEXT,
    position INT DEFAULT 0,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_blocks_page (page_id),
    INDEX idx_blocks_parent (parent_block_id),
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_block_id) REFERENCES blocks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 数据库表
CREATE TABLE IF NOT EXISTS `databases` (
    id CHAR(36) PRIMARY KEY,
    workspace_id CHAR(36) NOT NULL,
    page_id CHAR(36),
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    description TEXT,
    default_view ENUM('table', 'board', 'calendar') DEFAULT 'table',
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_databases_workspace (workspace_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 数据库字段表
CREATE TABLE IF NOT EXISTS database_fields (
    id CHAR(36) PRIMARY KEY,
    database_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    field_type ENUM('text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url', 'email', 'file') DEFAULT 'text',
    field_config TEXT,
    position INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fields_database (database_id),
    FOREIGN KEY (database_id) REFERENCES `databases`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 数据库记录表
CREATE TABLE IF NOT EXISTS database_records (
    id CHAR(36) PRIMARY KEY,
    database_id CHAR(36) NOT NULL,
    properties TEXT,
    position INT DEFAULT 0,
    created_by CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_records_database (database_id),
    FOREIGN KEY (database_id) REFERENCES `databases`(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文件表
CREATE TABLE IF NOT EXISTS files (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    size BIGINT,
    user_id CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_files_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 协作会话表
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id CHAR(36) PRIMARY KEY,
    page_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    cursor_position TEXT,
    status ENUM('active', 'idle', 'disconnected') DEFAULT 'active',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sessions_page (page_id),
    INDEX idx_sessions_user (user_id),
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建默认管理员用户 (密码: admin123)
-- bcrypt hash for 'admin123'
INSERT INTO users (id, email, password_hash, full_name, is_admin, is_active)
VALUES (
    UUID(),
    'admin@molink.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.n6WjN.I/NjRfSq',
    '系统管理员',
    TRUE,
    TRUE
) ON DUPLICATE KEY UPDATE email=email;
