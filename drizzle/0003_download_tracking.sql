-- Recreate releases table without download_id column
CREATE TABLE `releases_new` (
	`id` integer PRIMARY KEY NOT NULL,
	`movie_id` integer REFERENCES `movies`(`id`),
	`episode_id` integer REFERENCES `episodes`(`id`),
	`guid` text NOT NULL,
	`title` text NOT NULL,
	`download_url` text NOT NULL,
	`info_url` text,
	`size` integer NOT NULL,
	`publish_date` text NOT NULL,
	`indexer_id` text NOT NULL,
	`indexer_name` text NOT NULL,
	`nzb_path` text,
	`grabbed_at` text NOT NULL
);

INSERT INTO `releases_new` SELECT `id`, `movie_id`, `episode_id`, `guid`, `title`, `download_url`, `info_url`, `size`, `publish_date`, `indexer_id`, `indexer_name`, `nzb_path`, `grabbed_at` FROM `releases`;

DROP TABLE `releases`;

ALTER TABLE `releases_new` RENAME TO `releases`;

-- Recreate downloads table with new schema
CREATE TABLE `downloads_new` (
	`id` integer PRIMARY KEY NOT NULL,
	`release_id` integer REFERENCES `releases`(`id`),
	`nzb_id` integer,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`progress` real DEFAULT 0,
	`speed` text,
	`eta` text,
	`size` integer,
	`par_status` text,
	`unpack_status` text,
	`final_dir` text,
	`downloaded_size_mb` integer,
	`download_time_sec` integer,
	`queued_at` text NOT NULL,
	`completed_at` text
);

DROP TABLE `downloads`;

ALTER TABLE `downloads_new` RENAME TO `downloads`;
