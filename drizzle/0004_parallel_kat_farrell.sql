ALTER TABLE `gallery_images` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `product_images` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `deletedAt` integer;