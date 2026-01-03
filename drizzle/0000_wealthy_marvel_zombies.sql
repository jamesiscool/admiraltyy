CREATE TABLE `downloads` (
	`id` integer PRIMARY KEY NOT NULL,
	`movie_id` integer,
	`episode_id` integer,
	`title` text NOT NULL,
	`progress` real DEFAULT 0,
	`speed` text,
	`eta` text,
	`size` text,
	`status` text NOT NULL,
	`quality` text,
	`date_downloaded` text NOT NULL,
	`error_message` text,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` integer PRIMARY KEY NOT NULL,
	`season_id` integer,
	`episode_number` integer NOT NULL,
	`title` text NOT NULL,
	`air_date` text,
	`monitored` integer DEFAULT true,
	`runtime_mins` integer,
	`last_search_time` text,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` integer PRIMARY KEY NOT NULL,
	`movie_id` integer,
	`episode_id` integer,
	`path` text NOT NULL,
	`size` integer NOT NULL,
	`quality` text NOT NULL,
	`source` text,
	`codec` text,
	`date_imported` text NOT NULL,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `indexers` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`api_key` text NOT NULL,
	`enabled` integer DEFAULT true,
	`supports_search` integer DEFAULT true,
	`supports_tv_search` integer DEFAULT true,
	`supports_movie_search` integer DEFAULT true
);
--> statement-breakpoint
CREATE TABLE `movies` (
	`id` integer PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`imdb_id` text,
	`title` text NOT NULL,
	`year` integer NOT NULL,
	`poster_url` text,
	`backdrop_url` text,
	`synopsis` text,
	`runtime_mins` integer,
	`genres` text,
	`cast` text,
	`cinema_release_date` text,
	`digital_release_date` text,
	`content_rating` text,
	`date_added` text NOT NULL,
	`monitored` integer DEFAULT true,
	`resolution` text DEFAULT '1080p',
	`last_search_time` text,
	`last_info_sync` text,
	`rt_id` text,
	`rt_vanity` text,
	`alternate_titles` text
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY NOT NULL,
	`series_id` integer,
	`season_number` integer NOT NULL,
	`monitored` integer DEFAULT true,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` integer PRIMARY KEY NOT NULL,
	`tvdb_id` integer,
	`tmdb_id` integer NOT NULL,
	`imdb_id` text,
	`title` text NOT NULL,
	`year` integer NOT NULL,
	`status` text NOT NULL,
	`network` text,
	`overview` text,
	`poster_url` text,
	`backdrop_url` text,
	`genres` text,
	`runtime_mins` integer,
	`content_rating` text,
	`monitored` integer DEFAULT true,
	`resolution` text DEFAULT '1080p',
	`date_added` text NOT NULL,
	`next_airing` text,
	`last_info_sync` text,
	`rt_id` text,
	`rt_vanity` text,
	`alternate_titles` text
);
--> statement-breakpoint
CREATE TABLE `usenet_servers` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`host` text NOT NULL,
	`port` integer NOT NULL,
	`username` text,
	`password` text,
	`ssl` integer DEFAULT true,
	`priority` integer DEFAULT 0,
	`connections` integer DEFAULT 10,
	`enabled` integer DEFAULT true
);
