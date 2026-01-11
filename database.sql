-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 01, 2025 at 03:15 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `test`
--

-- --------------------------------------------------------

--
-- Table structure for table `assign_to_routes`
--

CREATE TABLE `assign_to_routes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `route_id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED DEFAULT NULL,
  `role` varchar(255) NOT NULL,
  `assignment_start_at` date NOT NULL,
  `shift` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bins`
--

CREATE TABLE `bins` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `bin_id` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `zone_id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `bin_type` varchar(255) DEFAULT NULL,
  `last_collection_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bins`
--

INSERT INTO `bins` (`id`, `bin_id`, `location`, `zone_id`, `vehicle_id`, `status`, `bin_type`, `last_collection_date`, `created_at`, `updated_at`) VALUES
(59, 'BIN-776', 'Location 1, Zone 7', 12, 4, 'active', 'recyclable', '2025-08-24', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `menus`
--

CREATE TABLE `menus` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `path` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `menus`
--

INSERT INTO `menus` (`id`, `name`, `path`, `created_at`, `updated_at`) VALUES
(1, 'Dashboard', '/', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(2, 'Waste List', '/waste-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(3, 'Add Waste', '/create-waste', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(4, 'Calendar', '/calendar', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(5, 'Zone List', '/zone-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(6, 'Add Zone', '/create-zone', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(7, 'Vehicle List', '/vehicle-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(8, 'Add Vehicle', '/create-vehicle', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(9, 'Document List', '/document-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(10, 'Add Document', '/create-document', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(11, 'Maintenance List', '/maintenance-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(12, 'Add Maintenance', '/create-maintenance', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(13, 'Bin List', '/bin-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(14, 'Add Bin', '/create-bin', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(15, 'Route List', '/route-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(16, 'Add Route', '/create-route', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(17, 'Staff List', '/staff-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(18, 'Add Staff', '/create-staff', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(19, 'Assign List', '/assign-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(20, 'Add Assign', '/create-assign', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(21, 'Attendance List', '/attendance-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(22, 'Add Attendance', '/create-attendance', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(23, 'Staff Document List', '/staff-document-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(24, 'Add Staff Document', '/create-staff-document', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(25, 'Waste Type List', '/waste-type-list', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(26, 'Add Waste Type', '/create-type', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(27, 'Waste Collection Reports', '/waste-collection-reports', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(28, 'Waste Type Reports', '/waste-type-reports', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(29, 'Staff Reports', '/staff-reports', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(30, 'Vehicle Reports', '/vehicle-reports', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(31, 'Settings', '/settings', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(32, 'SMTP Config', '/smtp-config', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(33, 'System Alerts', '/system-alerts', '2025-07-25 10:20:48', '2025-07-25 10:20:48'),
(34, 'Profile Setup', '/profile-setup', '2025-07-25 10:20:48', '2025-07-25 10:20:48');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`email`, `token`, `created_at`) VALUES
('admin@gmail.com', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoiYWRtaW5AZ21haWwuY29tIiwiaWF0IjoxNzU4MTg3MzQ2LCJleHAiOjE3NTgxOTA5NDZ9.7JZgtRHixWvdMvJTgA_gs5oDMSXsFHgwf9ne6LU2vHY', '2025-09-18 16:22:26');

-- --------------------------------------------------------

--
-- Table structure for table `routes`
--

CREATE TABLE `routes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `zone_id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED DEFAULT NULL,
  `staff_id` bigint(20) UNSIGNED DEFAULT NULL,
  `start_location` varchar(255) DEFAULT NULL,
  `end_location` varchar(255) DEFAULT NULL,
  `waypoints` varchar(255) DEFAULT NULL,
  `estimated_distance` decimal(8,2) DEFAULT NULL,
  `estimated_time` varchar(255) DEFAULT NULL,
  `special_instructions` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `routes`
--

INSERT INTO `routes` (`id`, `name`, `zone_id`, `vehicle_id`, `staff_id`, `start_location`, `end_location`, `waypoints`, `estimated_distance`, `estimated_time`, `special_instructions`, `status`, `created_at`, `updated_at`) VALUES
(16, 'morning route 1', 12, 5, NULL, 'Start Point 1', 'End Point 1', 'Waypoint1-1, Waypoint1-2', NULL, '5 hours', 'text', 'active', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `fav_icon` varchar(255) NOT NULL,
  `logo` varchar(255) NOT NULL,
  `copy_right` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `company_name`, `fav_icon`, `logo`, `copy_right`, `created_at`, `updated_at`) VALUES
(1, 'Trashsync', 'fav_icon-1758197118157-827116433.png', 'logo-1759318675551-812040927.png', '©2025 Trashsync. All Rights Reserved', '2025-07-24 18:46:57', '2025-07-24 20:57:20');

-- --------------------------------------------------------

--
-- Table structure for table `smtp_configs`
--

CREATE TABLE `smtp_configs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `mailer` varchar(255) DEFAULT NULL,
  `host` varchar(255) DEFAULT NULL,
  `port` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `mail_from_address` varchar(255) DEFAULT NULL,
  `mail_from_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) NOT NULL,
  `gender` enum('male','female','other') NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `nid_or_passport` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `file` varchar(255) DEFAULT NULL,
  `role` enum('manager','driver','collector','admin') NOT NULL,
  `joining_date` date NOT NULL,
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`id`, `vehicle_id`, `name`, `email`, `phone`, `gender`, `date_of_birth`, `nid_or_passport`, `address`, `file`, `role`, `joining_date`, `status`, `created_at`, `updated_at`) VALUES
(4, 6, 'Staff 4', NULL, '01712532079', 'male', '1994-07-22', '9554338777', 'Area 41, City', NULL, 'collector', '2021-07-22', 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(5, NULL, 'Staff 5', 'staff5_1753182296@example.com', '01716409116', 'female', '1993-07-22', '3947571953', 'Area 34, City', NULL, 'driver', '2022-07-22', 'suspended', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(6, NULL, 'Staff 6', 'staff6_1753182296@example.com', '01713913535', 'male', '1994-07-22', '9045342171', 'Area 24, City', NULL, 'collector', '2022-07-22', 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(7, NULL, 'Staff 7', 'staff7_1753182296@example.com', '01715200476', 'female', '1999-07-22', '3957923289', 'Area 39, City', NULL, 'driver', '2022-07-22', 'active', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(8, 11, 'Staff 8', NULL, '01716709837', 'male', '1993-07-22', '7240635919', 'Area 15, City', NULL, 'collector', '2022-07-22', 'active', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(9, NULL, 'Staff 9', 'staff9_1753182296@example.com', '01714541516', 'female', '1994-07-22', '6571265902', 'Area 29, City', NULL, 'collector', '2023-07-22', 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(10, 12, 'Staff 10', 'staff10_1753182296@example.com', '01716425847', 'male', '1986-07-22', '1098516035', 'Area 7, City', NULL, 'admin', '2024-07-22', 'active', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(11, 12, 'Staff 11', 'staff11_1753182296@example.com', '01712836612', 'female', '1996-07-22', '6411634733', 'Area 42, City', NULL, 'driver', '2024-07-22', 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(12, NULL, 'Staff 12', NULL, '01718715434', 'male', '1993-07-22', '8820516811', 'Area 42, City', NULL, 'collector', '2024-07-22', 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(13, NULL, 'Staff 13', 'staff13_1753182296@example.com', '01719685855', 'male', '1993-07-22', '7943341109', 'Area 35, City', NULL, 'driver', '2024-07-22', 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56');

-- --------------------------------------------------------

--
-- Table structure for table `staff_attendances`
--

CREATE TABLE `staff_attendances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `route_id` bigint(20) UNSIGNED DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `attendance_status` enum('present','absent','leave') NOT NULL DEFAULT 'present',
  `leave_type` enum('sick','casual','other') DEFAULT NULL,
  `check_in_time` time DEFAULT NULL,
  `check_out_time` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff_attendances`
--

INSERT INTO `staff_attendances` (`id`, `staff_id`, `route_id`, `attendance_date`, `role`, `attendance_status`, `leave_type`, `check_in_time`, `check_out_time`, `created_at`, `updated_at`) VALUES
(26, 6, NULL, '2025-07-07', 'collector', 'leave', 'casual', '08:53:00', NULL, '2025-07-22 18:04:57', '2025-08-28 20:56:01'),
(28, 6, NULL, '2025-06-29', 'collector', 'absent', 'casual', '08:02:00', '17:00:00', '2025-07-22 18:04:57', '2025-07-22 18:04:57'),
(29, 6, NULL, '2025-07-21', 'collector', 'leave', 'casual', '08:09:00', '17:21:00', '2025-07-22 18:04:57', '2025-07-22 18:04:57'),
(30, 6, NULL, '2025-07-06', 'collector', 'absent', 'casual', '08:40:00', '17:46:00', '2025-07-22 18:04:57', '2025-07-22 18:04:57'),
(31, 7, NULL, '2025-07-02', 'supervisor', 'leave', 'casual', '08:57:00', '17:06:00', '2025-07-22 18:04:57', '2025-07-22 18:04:57'),
(152, 6, NULL, '2025-08-21', 'driver', 'present', NULL, '05:46:00', '22:44:00', '2025-08-24 12:48:31', '2025-08-24 12:48:31'),
(153, 4, NULL, '2025-08-26', NULL, 'present', NULL, NULL, '08:23:00', '2025-08-26 14:23:36', '2025-08-26 14:23:36'),
(154, 7, 16, '2025-08-28', 'driver', 'absent', NULL, '16:01:00', NULL, '2025-08-28 21:00:29', '2025-09-18 23:06:15');

-- --------------------------------------------------------

--
-- Table structure for table `staff_documents`
--

CREATE TABLE `staff_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `document_type` enum('passport','license','certificate','id_card','other') NOT NULL,
  `document_number` varchar(255) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `file` varchar(255) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_alerts`
--

CREATE TABLE `system_alerts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `type` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `image`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`) VALUES
(1, 'Admin User', 'admin@trashsync.app', 'image-1759319152735-189058801.png', NULL, '$2a$12$YBLsejg5r0FSEaNxacSiUeUJWug7qrG6.xxcOW.J0y40DNkWYL1Ba', NULL, '2022-09-20 07:56:16', '2025-01-22 23:04:16');

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_number` varchar(255) NOT NULL,
  `vehicle_type` varchar(255) NOT NULL,
  `model_brand` varchar(255) DEFAULT NULL,
  `zone_id` bigint(20) UNSIGNED DEFAULT NULL,
  `staff_id` bigint(20) UNSIGNED DEFAULT NULL,
  `capacity_kg` int(11) DEFAULT NULL,
  `fuel_type` varchar(255) DEFAULT NULL,
  `fuel_efficiency` decimal(8,2) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`id`, `vehicle_number`, `vehicle_type`, `model_brand`, `zone_id`, `staff_id`, `capacity_kg`, `fuel_type`, `fuel_efficiency`, `status`, `created_at`, `updated_at`) VALUES
(3, 'DHK-0003', 'truck', 'Brand 4 Model 20', NULL, NULL, 4865, 'cng', 8.00, 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(4, 'DHK-0004', 'van', 'Brand 3 Model 19', NULL, 7, 3964, 'cng', 12.00, 'active', '2025-07-22 18:04:56', '2025-08-25 14:16:32'),
(5, 'DHK-0005', 'pickup', 'Brand 7 Model 8', NULL, NULL, 4101, 'petrol', 7.00, 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(6, 'DHK-0006', 'truck', 'Brand 6 Model 14', NULL, 10, 3100, 'cng', 9.00, 'maintenance', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(7, 'DHK-0007', 'pickup', 'Brand 1 Model 12', NULL, NULL, 3359, 'petrol', 9.00, 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(8, 'DHK-0008', 'truck', 'Brand 4 Model 3', NULL, NULL, 1415, 'diesel', 7.00, 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(9, 'DHK-0009', 'truck', 'Brand 6 Model 13', 9, NULL, 1521, 'cng', 10.00, 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(10, 'DHK-0010', 'pickup', 'Brand 9 Model 10', NULL, NULL, 1852, 'cng', 9.00, 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(11, 'DHK-0011', 'pickup', 'Brand 9 Model 9', NULL, NULL, 2873, 'cng', 13.00, 'maintenance', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(12, 'DHK-0012', 'truck', 'Brand 5 Model 8', NULL, NULL, 1628, 'diesel', 12.00, 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(13, 'DHK-0013', 'van', 'Brand 6 Model 9', NULL, 8, 3777, 'cng', 9.00, 'inactive', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(14, 'DHK-0014', 'pickup', 'Brand 1 Model 14', NULL, NULL, 3991, 'diesel', 5.00, 'maintenance', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(22, 'DHK-0001', 'Van', 'Brand 4 Model 5', 12, 12, 4977, 'diesel', 8.00, 'active', '2025-08-23 20:23:45', '2025-08-23 20:23:45'),
(25, 'DHK-067', 'Van', 'Brand 4 Model 5', NULL, 7, 4977, 'diesel', 8.00, 'active', '2025-08-28 19:43:16', '2025-08-28 19:43:16'),
(26, 'DHK-0003', 'Truck', 'tata', 12, 8, 3963, 'diesel', 12.00, 'active', '2025-08-29 13:41:47', '2025-08-29 13:41:47');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_documents`
--

CREATE TABLE `vehicle_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED NOT NULL,
  `document_type` varchar(255) NOT NULL,
  `document_number` varchar(255) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `file` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_maintenance_logs`
--

CREATE TABLE `vehicle_maintenance_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) UNSIGNED NOT NULL,
  `maintenance_date` date NOT NULL,
  `maintenance_type` varchar(255) NOT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `performed_by` varchar(255) DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `file` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'completed',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `wastes`
--

CREATE TABLE `wastes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `collected_date` date NOT NULL,
  `time_slot` varchar(255) DEFAULT NULL,
  `quantity` decimal(8,2) NOT NULL,
  `special_instructions` text DEFAULT NULL,
  `status` enum('pending','collected','cancelled') NOT NULL DEFAULT 'pending',
  `zone_id` bigint(20) UNSIGNED DEFAULT NULL,
  `vehicle_id` bigint(20) UNSIGNED DEFAULT NULL,
  `staff_id` bigint(20) UNSIGNED DEFAULT NULL,
  `waste_type_id` bigint(20) UNSIGNED NOT NULL,
  `bin_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `wastes`
--

INSERT INTO `wastes` (`id`, `collected_date`, `time_slot`, `quantity`, `special_instructions`, `status`, `zone_id`, `vehicle_id`, `staff_id`, `waste_type_id`, `bin_id`, `created_at`, `updated_at`) VALUES
(5, '2025-04-29', 'evening', 329.19, 'Special instructions for waste 5', 'collected', 14, 11, 9, 3, NULL, '2025-07-22 18:04:57', '2025-08-30 11:48:17'),
(8, '2025-04-01', 'evening', 374.32, 'Special instructions for waste 8', 'cancelled', NULL, NULL, NULL, 1, NULL, '2025-07-22 18:04:57', '2025-08-30 11:23:56'),
(9, '2025-01-01', 'evening', 60.99, 'Special instructions for waste 9', 'cancelled', NULL, NULL, NULL, 5, NULL, '2025-07-22 18:04:57', '2025-07-22 18:04:57'),
(10, '2025-05-01', 'afternoon', 130.72, 'Special instructions for waste 10', 'pending', NULL, 12, NULL, 4, NULL, '2025-07-22 18:04:57', '2025-07-22 18:04:57'),
(11, '2025-02-01', 'morning', 440.98, 'Special instructions for waste 11', 'collected', 9, 4, 5, 5, NULL, '2025-07-22 18:04:57', '2025-08-30 11:48:31'),
(104, '2025-08-27', '10:00 PM', 684.96, 'text ss', 'collected', 12, 9, 10, 3, NULL, '2025-08-23 18:14:14', '2025-08-30 11:41:46'),
(105, '2025-08-25', '10:30Am - 12:00 PM', 780.00, 'text', 'pending', NULL, NULL, 9, 3, NULL, NULL, NULL),
(107, '2025-08-27', '10:00 PM', 12.99, 'text', 'collected', 12, NULL, 11, 3, NULL, '2025-08-28 17:56:37', '2025-08-29 17:34:06');

-- --------------------------------------------------------

--
-- Table structure for table `waste_types`
--

CREATE TABLE `waste_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `waste_types`
--

INSERT INTO `waste_types` (`id`, `name`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Plastic', 'active', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(3, 'Paper', 'active', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(4, 'Glass', 'active', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(5, 'Metal', 'active', '2025-07-22 18:04:56', '2025-07-22 18:04:56');

-- --------------------------------------------------------

--
-- Table structure for table `zones`
--

CREATE TABLE `zones` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `area_names` text DEFAULT NULL,
  `staff_id` bigint(20) UNSIGNED DEFAULT NULL,
  `zone_type` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `zones`
--

INSERT INTO `zones` (`id`, `name`, `area_names`, `staff_id`, `zone_type`, `description`, `status`, `created_at`, `updated_at`) VALUES
(9, 'Zone 9', 'Area9-1, Area9-2', 6, 'rural', 'Description for Zone 9', 'active', '2025-07-22 18:04:56', '2025-07-22 18:04:56'),
(12, 'Zone 1', 'Area1-1, Area1-2', 10, 'urban', 'text ss', 'active', '2025-08-23 18:56:52', '2025-08-28 19:42:30'),
(14, 'Zone 3', 'Area1-1, Area1-2', 8, 'urban', 'text', 'active', '2025-08-30 11:47:57', '2025-08-30 11:47:57');

-- --------------------------------------------------------

--
-- Table structure for table `__drizzle_migrations`
--

CREATE TABLE `__drizzle_migrations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `hash` text NOT NULL,
  `created_at` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `__drizzle_migrations`
--

INSERT INTO `__drizzle_migrations` (`id`, `hash`, `created_at`) VALUES
(1, 'd1ace594e69f05ea412bcca29236b2889eec4135330be12f5d10eab0d38cd414', 1756523956356);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assign_to_routes`
--
ALTER TABLE `assign_to_routes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assign_to_routes_staff_id_foreign` (`staff_id`),
  ADD KEY `assign_to_routes_route_id_foreign` (`route_id`),
  ADD KEY `assign_to_routes_vehicle_id_foreign` (`vehicle_id`);

--
-- Indexes for table `bins`
--
ALTER TABLE `bins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bins_zone_id_foreign` (`zone_id`),
  ADD KEY `bins_vehicle_id_foreign` (`vehicle_id`),
  ADD KEY `bins_bin_id_unique` (`bin_id`) USING BTREE;

--
-- Indexes for table `menus`
--
ALTER TABLE `menus`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `routes`
--
ALTER TABLE `routes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `routes_zone_id_foreign` (`zone_id`),
  ADD KEY `routes_vehicle_id_foreign` (`vehicle_id`),
  ADD KEY `routes_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `smtp_configs`
--
ALTER TABLE `smtp_configs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `staff_phone_unique` (`phone`),
  ADD UNIQUE KEY `staff_email_unique` (`email`),
  ADD KEY `staff_vehicle_id_foreign` (`vehicle_id`);

--
-- Indexes for table `staff_attendances`
--
ALTER TABLE `staff_attendances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_attendances_staff_id_foreign` (`staff_id`),
  ADD KEY `staff_attendances_route_id_foreign` (`route_id`);

--
-- Indexes for table `staff_documents`
--
ALTER TABLE `staff_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_documents_staff_id_foreign` (`staff_id`),
  ADD KEY `staff_documents_document_number_unique` (`document_number`) USING BTREE;

--
-- Indexes for table `system_alerts`
--
ALTER TABLE `system_alerts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicles_zone_id_foreign` (`zone_id`),
  ADD KEY `vehicles_staff_id_foreign` (`staff_id`),
  ADD KEY `vehicles_vehicle_number_unique` (`vehicle_number`);

--
-- Indexes for table `vehicle_documents`
--
ALTER TABLE `vehicle_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_documents_vehicle_id_foreign` (`vehicle_id`);

--
-- Indexes for table `vehicle_maintenance_logs`
--
ALTER TABLE `vehicle_maintenance_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vehicle_maintenance_logs_vehicle_id_foreign` (`vehicle_id`);

--
-- Indexes for table `wastes`
--
ALTER TABLE `wastes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `wastes_zone_id_foreign` (`zone_id`),
  ADD KEY `wastes_vehicle_id_foreign` (`vehicle_id`),
  ADD KEY `wastes_staff_id_foreign` (`staff_id`),
  ADD KEY `wastes_waste_type_id_foreign` (`waste_type_id`),
  ADD KEY `wastes_bin_id_foreign` (`bin_id`);

--
-- Indexes for table `waste_types`
--
ALTER TABLE `waste_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `zones`
--
ALTER TABLE `zones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `zones_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `__drizzle_migrations`
--
ALTER TABLE `__drizzle_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `assign_to_routes`
--
ALTER TABLE `assign_to_routes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `bins`
--
ALTER TABLE `bins`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `menus`
--
ALTER TABLE `menus`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `routes`
--
ALTER TABLE `routes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `smtp_configs`
--
ALTER TABLE `smtp_configs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `staff_attendances`
--
ALTER TABLE `staff_attendances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=155;

--
-- AUTO_INCREMENT for table `staff_documents`
--
ALTER TABLE `staff_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `system_alerts`
--
ALTER TABLE `system_alerts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=215;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `vehicle_documents`
--
ALTER TABLE `vehicle_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `vehicle_maintenance_logs`
--
ALTER TABLE `vehicle_maintenance_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `wastes`
--
ALTER TABLE `wastes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;

--
-- AUTO_INCREMENT for table `waste_types`
--
ALTER TABLE `waste_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `zones`
--
ALTER TABLE `zones`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `__drizzle_migrations`
--
ALTER TABLE `__drizzle_migrations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assign_to_routes`
--
ALTER TABLE `assign_to_routes`
  ADD CONSTRAINT `assign_to_routes_route_id_foreign` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assign_to_routes_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assign_to_routes_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bins`
--
ALTER TABLE `bins`
  ADD CONSTRAINT `bins_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `bins_zone_id_foreign` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `routes`
--
ALTER TABLE `routes`
  ADD CONSTRAINT `routes_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `routes_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `routes_zone_id_foreign` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `staff`
--
ALTER TABLE `staff`
  ADD CONSTRAINT `staff_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `staff_attendances`
--
ALTER TABLE `staff_attendances`
  ADD CONSTRAINT `staff_attendances_route_id_foreign` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `staff_attendances_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `staff_documents`
--
ALTER TABLE `staff_documents`
  ADD CONSTRAINT `staff_documents_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `vehicles_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `vehicles_zone_id_foreign` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `vehicle_documents`
--
ALTER TABLE `vehicle_documents`
  ADD CONSTRAINT `vehicle_documents_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `vehicle_maintenance_logs`
--
ALTER TABLE `vehicle_maintenance_logs`
  ADD CONSTRAINT `vehicle_maintenance_logs_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `wastes`
--
ALTER TABLE `wastes`
  ADD CONSTRAINT `wastes_bin_id_foreign` FOREIGN KEY (`bin_id`) REFERENCES `bins` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `wastes_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `wastes_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `wastes_waste_type_id_foreign` FOREIGN KEY (`waste_type_id`) REFERENCES `waste_types` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `wastes_zone_id_foreign` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `zones`
--
ALTER TABLE `zones`
  ADD CONSTRAINT `zones_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
