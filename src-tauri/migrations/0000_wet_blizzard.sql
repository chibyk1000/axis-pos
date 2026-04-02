CREATE TABLE `barcodes` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`product_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barcodes_value_unique` ON `barcodes` (`value`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`author_id` text,
	`content` text NOT NULL,
	`parent_id` text,
	`is_edited` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tax_number` text,
	`street_name` text,
	`building_number` text,
	`additional_street_name` text,
	`plot_identification` text,
	`district` text,
	`postal_code` text,
	`city` text,
	`state_province` text,
	`country_code` text,
	`phone` text,
	`email` text,
	`bank_account_number` text,
	`bank_details` text,
	`logo_path` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `void_reasons` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`reason` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `countries_code_unique` ON `countries` (`code`);--> statement-breakpoint
CREATE TABLE `customer_discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`tax_number` text,
	`street_name` text,
	`building_number` text,
	`additional_street_name` text,
	`plot_identification` text,
	`district` text,
	`postal_code` text,
	`city` text,
	`state_province` text,
	`country` text,
	`phone_number` text,
	`email` text,
	`active` integer DEFAULT true NOT NULL,
	`customer` integer DEFAULT true NOT NULL,
	`payment_terms_days` integer,
	`tax_exempt` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `loyalty_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`number` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_items` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text,
	`quantity` real NOT NULL,
	`price_before_tax` real NOT NULL,
	`tax_rate` real DEFAULT 0,
	`discount` real DEFAULT 0,
	`total` real NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `docmentPayments` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`status` text DEFAULT 'pending',
	`payment_type` text,
	`amount` real NOT NULL,
	`date` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_id`) REFERENCES `payment_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`external_number` text,
	`customer_id` text NOT NULL,
	`date` integer NOT NULL,
	`due_date` integer,
	`stock_date` integer,
	`paid` integer DEFAULT false,
	`status` text DEFAULT 'draft',
	`total_before_tax` real DEFAULT 0,
	`tax_total` real DEFAULT 0,
	`total` real DEFAULT 0,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text,
	`type` text NOT NULL,
	`parent_id` text,
	`image` text,
	`color` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`parent_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_taxes` (
	`product_id` text NOT NULL,
	`tax_id` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tax_id`) REFERENCES `taxes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`supplier_id` text,
	`title` text NOT NULL,
	`code` text NOT NULL,
	`unit` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`service` integer DEFAULT false NOT NULL,
	`default_quantity` integer DEFAULT false NOT NULL,
	`age_restriction` integer,
	`cost` real DEFAULT 0 NOT NULL,
	`markup` real DEFAULT 0 NOT NULL,
	`sale_price` real DEFAULT 0 NOT NULL,
	`price_after_tax` integer DEFAULT false NOT NULL,
	`price_change_allowed` integer DEFAULT false NOT NULL,
	`reorder_point` real,
	`preferred_quantity` real,
	`low_stock_warning` integer DEFAULT false NOT NULL,
	`low_stock_warning_quantity` real DEFAULT 0,
	`description` text,
	`image` text,
	`color` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supplier_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `taxes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`rate` real NOT NULL,
	`fixed` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `taxes_code_unique` ON `taxes` (`code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`password_hash` text,
	`access_level` integer DEFAULT 1 NOT NULL,
	`age` integer DEFAULT 18,
	`city` text DEFAULT 'NULL',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`deleted_at` text DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_id_unique` ON `users` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `stock_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text DEFAULT 'in' NOT NULL,
	`quantity` real NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `promotion_bogo` (
	`id` text PRIMARY KEY NOT NULL,
	`promotion_id` text NOT NULL,
	`buy_product_id` text NOT NULL,
	`buy_quantity` integer DEFAULT 1 NOT NULL,
	`get_product_id` text NOT NULL,
	`get_quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`buy_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`get_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `promotion_customers` (
	`promotion_id` text NOT NULL,
	`customer_id` text NOT NULL,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `promotion_nodes` (
	`promotion_id` text NOT NULL,
	`node_id` text NOT NULL,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`node_id`) REFERENCES `nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `promotion_products` (
	`promotion_id` text NOT NULL,
	`product_id` text NOT NULL,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`scope` text NOT NULL,
	`value` real,
	`min_order_value` real,
	`min_quantity` integer,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `cash_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`payment_type_id` text NOT NULL,
	`amount` real NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customer_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_balances_customer_id_unique` ON `customer_balances` (`customer_id`);--> statement-breakpoint
CREATE TABLE `open_sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`open_sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price` real NOT NULL,
	`discount` real DEFAULT 0,
	`total` real NOT NULL,
	FOREIGN KEY (`open_sale_id`) REFERENCES `open_sales`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `open_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`name` text,
	`customer_id` text,
	`note` text,
	`total` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `payment_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`quick_payment` integer DEFAULT false NOT NULL,
	`customer_required` integer DEFAULT false NOT NULL,
	`change_allowed` integer DEFAULT false NOT NULL,
	`mark_transaction_as_paid` integer DEFAULT false NOT NULL,
	`print_receipt` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer
);
