CREATE TABLE `users` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`image` varchar(191),
	`email_verified_at` datetime,
	`password` varchar(255) NOT NULL,
	`remember_token` varchar(100),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`email` varchar(191) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp,
	CONSTRAINT `password_reset_tokens_email` PRIMARY KEY(`email`)
);
--> statement-breakpoint
CREATE TABLE `assign_to_routes` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`staff_id` bigint NOT NULL,
	`route_id` bigint NOT NULL,
	`vehicle_id` bigint,
	`role` varchar(191) NOT NULL,
	`assignment_start_at` date NOT NULL,
	`shift` varchar(191),
	`status` varchar(64) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assign_to_routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`zone_id` bigint NOT NULL,
	`vehicle_id` bigint,
	`staff_id` bigint,
	`start_location` varchar(191),
	`end_location` varchar(191),
	`waypoints` varchar(191),
	`estimated_distance` decimal(8,2),
	`estimated_time` varchar(191),
	`special_instructions` text,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zones` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`area_names` text,
	`staff_id` bigint,
	`zone_type` varchar(191),
	`description` text,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`company_name` varchar(191) NOT NULL,
	`fav_icon` varchar(191) NOT NULL,
	`logo` varchar(191) NOT NULL,
	`copy_right` varchar(191) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_alerts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`type` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`message` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smtp_configs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`mailer` varchar(191),
	`host` varchar(191),
	`port` varchar(191),
	`username` varchar(191),
	`password` varchar(191),
	`mail_from_address` varchar(191),
	`mail_from_name` varchar(191),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smtp_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`path` varchar(191) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`vehicle_number` varchar(191) NOT NULL,
	`vehicle_type` varchar(191) NOT NULL,
	`model_brand` varchar(191),
	`zone_id` bigint,
	`staff_id` bigint,
	`capacity_kg` int,
	`fuel_type` varchar(191),
	`fuel_efficiency` decimal(8,2),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_documents` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`vehicle_id` bigint NOT NULL,
	`document_type` varchar(191) NOT NULL,
	`document_number` varchar(191),
	`issue_date` date,
	`expiry_date` date,
	`file` varchar(191) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_maintenance_logs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`vehicle_id` bigint NOT NULL,
	`maintenance_date` date NOT NULL,
	`maintenance_type` varchar(191) NOT NULL,
	`cost` decimal(10,2),
	`location` varchar(191),
	`performed_by` varchar(191),
	`next_maintenance_date` date,
	`file` varchar(191),
	`notes` text,
	`status` varchar(32) NOT NULL DEFAULT 'completed',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_maintenance_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`vehicle_id` bigint,
	`name` varchar(191) NOT NULL,
	`email` varchar(191),
	`phone` varchar(64) NOT NULL,
	`gender` enum('male','female','other') NOT NULL,
	`date_of_birth` date,
	`nid_or_passport` varchar(191),
	`address` text,
	`file` varchar(191),
	`role` enum('manager','driver','collector','admin') NOT NULL,
	`joining_date` date NOT NULL,
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_email_unique` UNIQUE(`email`),
	CONSTRAINT `staff_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `staff_attendances` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`staff_id` bigint NOT NULL,
	`route_id` bigint,
	`attendance_date` date NOT NULL,
	`role` varchar(191),
	`attendance_status` enum('present','absent','leave') NOT NULL DEFAULT 'present',
	`leave_type` enum('sick','casual','other'),
	`check_in_time` time,
	`check_out_time` time,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_attendances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_documents` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`staff_id` bigint NOT NULL,
	`document_type` enum('passport','license','certificate','id_card','other') NOT NULL,
	`document_number` varchar(191),
	`issue_date` date,
	`expiry_date` date,
	`file` varchar(191) NOT NULL,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waste_types` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waste_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bins` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`bin_id` varchar(191) NOT NULL,
	`location` varchar(191) NOT NULL,
	`zone_id` bigint NOT NULL,
	`vehicle_id` bigint,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`bin_type` varchar(191),
	`last_collection_date` date,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wastes` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`collected_date` date NOT NULL,
	`time_slot` varchar(191),
	`quantity` decimal(8,2) NOT NULL,
	`special_instructions` text,
	`status` enum('pending','collected','cancelled') NOT NULL DEFAULT 'pending',
	`zone_id` bigint,
	`vehicle_id` bigint,
	`staff_id` bigint,
	`waste_type_id` bigint NOT NULL,
	`bin_id` bigint,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wastes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assign_to_routes` ADD CONSTRAINT `assign_to_routes_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assign_to_routes` ADD CONSTRAINT `assign_to_routes_route_id_routes_id_fk` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assign_to_routes` ADD CONSTRAINT `assign_to_routes_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routes` ADD CONSTRAINT `routes_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routes` ADD CONSTRAINT `routes_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `routes` ADD CONSTRAINT `routes_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `zones` ADD CONSTRAINT `zones_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_documents` ADD CONSTRAINT `vehicle_documents_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_maintenance_logs` ADD CONSTRAINT `vehicle_maintenance_logs_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `staff_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_attendances` ADD CONSTRAINT `staff_attendances_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_attendances` ADD CONSTRAINT `staff_attendances_route_id_routes_id_fk` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_documents` ADD CONSTRAINT `staff_documents_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bins` ADD CONSTRAINT `bins_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bins` ADD CONSTRAINT `bins_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wastes` ADD CONSTRAINT `wastes_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wastes` ADD CONSTRAINT `wastes_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wastes` ADD CONSTRAINT `wastes_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wastes` ADD CONSTRAINT `wastes_waste_type_id_waste_types_id_fk` FOREIGN KEY (`waste_type_id`) REFERENCES `waste_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wastes` ADD CONSTRAINT `wastes_bin_id_bins_id_fk` FOREIGN KEY (`bin_id`) REFERENCES `bins`(`id`) ON DELETE set null ON UPDATE no action;