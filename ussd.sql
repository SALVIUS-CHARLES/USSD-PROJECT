//*a name of a database is ussd_db;


the following are the databases tables sql commands;

-- a name of a database is ussd_db;

-- the following are the databases tables sql commands;

CREATE TABLE retailers (
    retailer_id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    tin_number VARCHAR(20) UNIQUE,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_approved TINYINT(1) DEFAULT 0,
    PRIMARY KEY (retailer_id)
);


CREATE TABLE products (
    product_id INT(11) NOT NULL AUTO_INCREMENT,
    product_name VARCHAR(255) NOT NULL,
    product_cost DECIMAL(10,2) NOT NULL,
    retailer_id INT(11) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id),
    FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Modified ORDERS table: Removed product_id
CREATE TABLE orders (
    order_id INT(11) NOT NULL AUTO_INCREMENT,
    customer_name VARCHAR(255),
    phone_number VARCHAR(20),
    location VARCHAR(255),
    retailer_id INT(11), -- Keep retailer_id to link order to a specific retailer
    order_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id),
    FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- New ORDER_ITEMS table to handle multiple products per order
CREATE TABLE order_items (
    order_item_id INT(11) NOT NULL AUTO_INCREMENT,
    order_id INT(11) NOT NULL,
    product_id INT(11) NOT NULL,
    quantity INT(11) NOT NULL,
    item_price DECIMAL(10,2) NOT NULL, -- Price at the time of order
    PRIMARY KEY (order_item_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT -- Prevent deleting product if part of an order
        ON UPDATE CASCADE
);