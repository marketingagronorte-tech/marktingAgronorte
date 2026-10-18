CREATE TABLE `marketing_members` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE TABLE `marketing_records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`owner` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `marketing_system` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
