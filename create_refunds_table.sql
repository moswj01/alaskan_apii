-- สร้างตาราง refunds สำหรับจัดการข้อมูลการคืนเงิน
CREATE TABLE refunds (
    id BIGINT(20) AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT(20) NOT NULL,
    customer_id BIGINT(20) NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_reason TEXT NOT NULL,
    refund_type ENUM('FULL', 'PARTIAL') NOT NULL DEFAULT 'FULL',
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    requested_by BIGINT(20) NOT NULL,
    approved_by BIGINT(20) NULL,
    refund_reference VARCHAR(100) NULL,
    refund_method ENUM('BANK_TRANSFER', 'CREDIT_CARD', 'WALLET', 'CASH') NOT NULL DEFAULT 'BANK_TRANSFER',
    bank_account_name VARCHAR(191) NULL,
    bank_account_number VARCHAR(50) NULL,
    bank_name VARCHAR(191) NULL,
    notes TEXT NULL,
    processed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),

-- Foreign Keys
FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE RESTRICT,
FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE RESTRICT,

-- Indexes
INDEX idx_order_id (order_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);