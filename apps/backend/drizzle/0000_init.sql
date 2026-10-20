CREATE TABLE `Blank` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`question_id` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `Question`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`course_id` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `Course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Category_name_courseId_key` ON `Category` (`name`,`course_id`);--> statement-breakpoint
CREATE TABLE `Course` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Course_name_unique` ON `Course` (`name`);--> statement-breakpoint
CREATE TABLE `Option` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`text` text NOT NULL,
	`question_id` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `Question`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Question` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`text` text NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`category_id` integer,
	`course_id` integer,
	FOREIGN KEY (`category_id`) REFERENCES `Category`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`course_id`) REFERENCES `Course`(`id`) ON UPDATE no action ON DELETE set null
);
