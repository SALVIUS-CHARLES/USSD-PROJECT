//*a name of a database is ussd_db;


the following are the databases tables sql commands;

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

CREATE TABLE orders (
    order_id INT(11) NOT NULL AUTO_INCREMENT,
    customer_name VARCHAR(255),
    phone_number VARCHAR(20),
    location VARCHAR(255),
    product_id INT(11),
    retailer_id INT(11),
    order_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    FOREIGN KEY (retailer_id) REFERENCES retailers(retailer_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);
