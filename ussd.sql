//*a name of a database is ussd_db;


the following are the databases tables sql commands;

CREATE TABLE customers (
    customer_id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id)
);


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
    FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id) ON DELETE CASCADE
);


CREATE TABLE orders (
    order_id INT(11) NOT NULL AUTO_INCREMENT,
    retailer_id INT(11) NOT NULL,
    order_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    customer_id INT(11) NOT NULL,
    PRIMARY KEY (order_id),
    FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);


CREATE TABLE order_items (
    order_item_id INT(11) NOT NULL AUTO_INCREMENT,
    order_id INT(11) NOT NULL,
    product_id INT(11) NOT NULL,
    quantity INT(11) NOT NULL,
    item_price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_item_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);


CREATE TABLE feedback (
    feedback_id INT(11) NOT NULL AUTO_INCREMENT,
    customer_id INT(11) NOT NULL,
    product_id INT(11),
    retailer_id INT(11),
    order_id INT(11) NOT NULL,
    feedback_text TEXT NOT NULL,
    feedback_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (feedback_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL,
    FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);
