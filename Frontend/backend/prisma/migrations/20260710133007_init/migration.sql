-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "role_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "phone" VARCHAR(20),
    "avatar_url" VARCHAR(500),
    "last_login_at" TIMESTAMP(3),
    "refresh_token" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL DEFAULT 'Video Analytics Software',
    "license_key" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'inactive',
    "max_seats" INTEGER NOT NULL DEFAULT 2,
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "activated_by" UUID,
    "organization" VARCHAR(255),
    "contract_number" VARCHAR(100),
    "contact_email" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_modules" (
    "id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "module_code" VARCHAR(10) NOT NULL,
    "module_name" VARCHAR(255) NOT NULL,
    "sub_license_code" VARCHAR(10) NOT NULL,
    "sub_license_name" VARCHAR(500) NOT NULL,
    "sub_license_key" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "activated_by" UUID,
    "price_idr" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_seats" (
    "id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "session_token" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_history" (
    "id" UUID NOT NULL,
    "license_id" UUID,
    "module_code" VARCHAR(10),
    "sub_license_code" VARCHAR(10),
    "action" VARCHAR(30) NOT NULL,
    "performed_by" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "altitude" DECIMAL(10,2),
    "address" TEXT,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    "status" VARCHAR(20) NOT NULL DEFAULT 'offline',
    "vpn_config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100),
    "serial_number" VARCHAR(100),
    "firmware_version" VARCHAR(50),
    "connection_type" VARCHAR(20) NOT NULL DEFAULT 'ethernet',
    "ip_address" VARCHAR(45),
    "port" INTEGER NOT NULL DEFAULT 15004,
    "serial_port" VARCHAR(20),
    "baud_rate" INTEGER NOT NULL DEFAULT 57600,
    "status" VARCHAR(20) NOT NULL DEFAULT 'offline',
    "last_seen_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gimbal_settings" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "optical_zoom_speed" INTEGER NOT NULL DEFAULT 4,
    "focus_adjustment" INTEGER NOT NULL DEFAULT 128,
    "dead_zone_offset" INTEGER NOT NULL DEFAULT 1500,
    "speed_limit" INTEGER NOT NULL DEFAULT 20,
    "stow_pan_angle" DECIMAL(6,2),
    "stow_tilt_angle" DECIMAL(6,2),
    "joystick_dynamic_rate" BOOLEAN NOT NULL DEFAULT false,
    "joystick_tilt_reverse" BOOLEAN NOT NULL DEFAULT false,
    "video_codec" VARCHAR(30) NOT NULL DEFAULT 'H264_HD',
    "video_port" INTEGER NOT NULL DEFAULT 15004,
    "video_mode" VARCHAR(10) NOT NULL DEFAULT 'PAL',
    "video_bitrate" INTEGER NOT NULL DEFAULT 1500000,
    "gimbal_ip" VARCHAR(15) NOT NULL DEFAULT '192.168.10.100',
    "gimbal_subnet" VARCHAR(15) NOT NULL DEFAULT '255.255.255.0',
    "gimbal_gateway" VARCHAR(15) NOT NULL DEFAULT '192.168.10.1',
    "enhance_filter" VARCHAR(20) NOT NULL DEFAULT 'NONE',
    "auto_connect" BOOLEAN NOT NULL DEFAULT true,
    "log_telemetry" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gimbal_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crowd_counting_sessions" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "started_by" UUID NOT NULL,
    "source_name" VARCHAR(255) NOT NULL,
    "source_type" VARCHAR(10) NOT NULL,
    "source_address" VARCHAR(500) NOT NULL,
    "frame_size" VARCHAR(20) NOT NULL DEFAULT '1280x720',
    "detection_type" VARCHAR(30) NOT NULL DEFAULT 'crowd_counting',
    "status" VARCHAR(20) NOT NULL DEFAULT 'configured',
    "total_frames" INTEGER NOT NULL DEFAULT 0,
    "avg_count" DECIMAL(10,2),
    "max_count" INTEGER,
    "min_count" INTEGER,
    "started_at" TIMESTAMP(3),
    "stopped_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crowd_counting_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detection_sessions" (
    "id" UUID NOT NULL,
    "device_id" UUID,
    "site_id" UUID NOT NULL,
    "started_by" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "sub_license" VARCHAR(10) NOT NULL,
    "model_name" VARCHAR(100) NOT NULL DEFAULT 'yolov8',
    "confidence_threshold" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "roi_polygon" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "total_objects" INTEGER NOT NULL DEFAULT 0,
    "total_frames" INTEGER NOT NULL DEFAULT 0,
    "unique_classes" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detection_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detection_results" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "frame_number" INTEGER,
    "objects" JSONB NOT NULL DEFAULT '[]',
    "total_objects" INTEGER NOT NULL DEFAULT 0,
    "processing_ms" INTEGER,
    "image_path" VARCHAR(500),
    "annotated_path" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detection_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flights" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "mission_name" VARCHAR(255) NOT NULL,
    "mission_type" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'planned',
    "balloon_type" VARCHAR(50) NOT NULL DEFAULT 'SkyStar_180',
    "payload_config" VARCHAR(50),
    "team_lead" VARCHAR(255),
    "crew_members" JSONB NOT NULL DEFAULT '[]',
    "target_altitude" DECIMAL(10,2),
    "target_area" JSONB,
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "planned_start" TIMESTAMP(3),
    "planned_end" TIMESTAMP(3),
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "block_time" INTEGER,
    "post_flight_notes" TEXT,
    "weather_conditions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_logs" (
    "id" UUID NOT NULL,
    "flight_id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flight_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "rule_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "severity" VARCHAR(10) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "source_data" JSONB NOT NULL DEFAULT '{}',
    "device_id" UUID,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMP(3),
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "notified_via" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "severity" VARCHAR(10) NOT NULL,
    "conditions" JSONB NOT NULL,
    "notification_channels" JSONB NOT NULL DEFAULT '["web_push"]',
    "auto_action" VARCHAR(50),
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "cooldown_sec" INTEGER NOT NULL DEFAULT 300,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "targets" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "altitude" DECIMAL(10,2),
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "category" VARCHAR(50),
    "notes" TEXT,
    "icon" VARCHAR(50) NOT NULL DEFAULT 'default',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordings" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "stopped_at" TIMESTAMP(3),
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" BIGINT,
    "duration" INTEGER,
    "format" VARCHAR(10) NOT NULL DEFAULT 'mp4',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" BIGINT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "format" VARCHAR(10) NOT NULL DEFAULT 'pdf',
    "file_path" VARCHAR(500),
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "cron_expression" VARCHAR(50) NOT NULL,
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(255) NOT NULL,
    "resource_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "status_code" INTEGER NOT NULL DEFAULT 200,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_license_key_key" ON "licenses"("license_key");

-- CreateIndex
CREATE UNIQUE INDEX "license_modules_sub_license_key_key" ON "license_modules"("sub_license_key");

-- CreateIndex
CREATE INDEX "license_modules_sub_license_code_is_active_idx" ON "license_modules"("sub_license_code", "is_active");

-- CreateIndex
CREATE INDEX "license_modules_license_id_idx" ON "license_modules"("license_id");

-- CreateIndex
CREATE UNIQUE INDEX "license_modules_license_id_sub_license_code_key" ON "license_modules"("license_id", "sub_license_code");

-- CreateIndex
CREATE INDEX "license_seats_license_id_is_active_idx" ON "license_seats"("license_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "license_seats_license_id_user_id_key" ON "license_seats"("license_id", "user_id");

-- CreateIndex
CREATE INDEX "license_history_created_at_idx" ON "license_history"("created_at" DESC);

-- CreateIndex
CREATE INDEX "license_history_license_id_idx" ON "license_history"("license_id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE INDEX "sites_code_idx" ON "sites"("code");

-- CreateIndex
CREATE INDEX "sites_status_idx" ON "sites"("status");

-- CreateIndex
CREATE UNIQUE INDEX "devices_serial_number_key" ON "devices"("serial_number");

-- CreateIndex
CREATE INDEX "devices_site_id_idx" ON "devices"("site_id");

-- CreateIndex
CREATE INDEX "devices_type_idx" ON "devices"("type");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "gimbal_settings_device_id_key" ON "gimbal_settings"("device_id");

-- CreateIndex
CREATE INDEX "crowd_counting_sessions_device_id_idx" ON "crowd_counting_sessions"("device_id");

-- CreateIndex
CREATE INDEX "crowd_counting_sessions_status_idx" ON "crowd_counting_sessions"("status");

-- CreateIndex
CREATE INDEX "detection_sessions_site_id_idx" ON "detection_sessions"("site_id");

-- CreateIndex
CREATE INDEX "detection_results_session_id_created_at_idx" ON "detection_results"("session_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "flights_site_id_created_at_idx" ON "flights"("site_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "flights_status_idx" ON "flights"("status");

-- CreateIndex
CREATE INDEX "flight_logs_flight_id_created_at_idx" ON "flight_logs"("flight_id", "created_at");

-- CreateIndex
CREATE INDEX "alerts_site_id_severity_created_at_idx" ON "alerts"("site_id", "severity", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "alert_rules_site_id_name_key" ON "alert_rules"("site_id", "name");

-- CreateIndex
CREATE INDEX "targets_site_id_idx" ON "targets"("site_id");

-- CreateIndex
CREATE INDEX "recordings_device_id_started_at_idx" ON "recordings"("device_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "snapshots_device_id_created_at_idx" ON "snapshots"("device_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reports_site_id_created_at_idx" ON "reports"("site_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_modules" ADD CONSTRAINT "license_modules_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_modules" ADD CONSTRAINT "license_modules_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_seats" ADD CONSTRAINT "license_seats_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_seats" ADD CONSTRAINT "license_seats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_history" ADD CONSTRAINT "license_history_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_history" ADD CONSTRAINT "license_history_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gimbal_settings" ADD CONSTRAINT "gimbal_settings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crowd_counting_sessions" ADD CONSTRAINT "crowd_counting_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crowd_counting_sessions" ADD CONSTRAINT "crowd_counting_sessions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crowd_counting_sessions" ADD CONSTRAINT "crowd_counting_sessions_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detection_sessions" ADD CONSTRAINT "detection_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detection_sessions" ADD CONSTRAINT "detection_sessions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detection_sessions" ADD CONSTRAINT "detection_sessions_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detection_results" ADD CONSTRAINT "detection_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "detection_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "flights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "targets" ADD CONSTRAINT "targets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "targets" ADD CONSTRAINT "targets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
