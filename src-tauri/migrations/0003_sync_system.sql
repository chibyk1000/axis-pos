CREATE TABLE IF NOT EXISTS `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`ip` text NOT NULL,
	`role` text NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sync_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`action` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL,
	`device_id` text
);
