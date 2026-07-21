CREATE TABLE IF NOT EXISTS `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`user_name` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`description` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_logs_user_id_idx` ON `activity_logs` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_logs_entity_idx` ON `activity_logs` (`entity_type`,`entity_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_logs_created_at_idx` ON `activity_logs` (`created_at`);
