CREATE TABLE `gallery_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`productId` integer,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	`variants` text DEFAULT '{}' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
