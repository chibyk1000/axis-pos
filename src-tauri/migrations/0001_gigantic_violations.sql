PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_docmentPayments` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`status` text DEFAULT 'pending',
	`payment_type` text,
	`amount` real NOT NULL,
	`date` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_docmentPayments`("id", "document_id", "payment_id", "status", "payment_type", "amount", "date") SELECT "id", "document_id", "payment_id", "status", "payment_type", "amount", "date" FROM `docmentPayments`;--> statement-breakpoint
DROP TABLE `docmentPayments`;--> statement-breakpoint
ALTER TABLE `__new_docmentPayments` RENAME TO `docmentPayments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;