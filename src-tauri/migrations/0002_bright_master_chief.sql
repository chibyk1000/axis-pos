ALTER TABLE `countries` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `taxes` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `promotions` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_logs` ADD `document_id` text REFERENCES documents(id);