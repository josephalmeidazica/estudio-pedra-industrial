ALTER TABLE `product_images` ADD `width` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `product_images` ADD `height` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `product_images` ADD `variants` text DEFAULT '{}' NOT NULL;