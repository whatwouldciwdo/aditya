CREATE TYPE "public"."document_status" AS ENUM('DRAFT', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "operational_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(40) NOT NULL,
	"title" varchar(200) NOT NULL,
	"status" "document_status" DEFAULT 'DRAFT' NOT NULL,
	"formula_version" varchar(100),
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" varchar(20) DEFAULT '1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" varchar(60) NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" uuid,
	"correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"source_address" varchar(64),
	"user_agent" text,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "operational_documents_status_idx" ON "operational_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_logs_entity_idx" ON "system_logs" USING btree ("entity_type","entity_id");