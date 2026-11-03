import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const documentStatus = pgEnum("document_status", ["DRAFT", "ARCHIVED"]);

export const operationalDocuments = pgTable(
  "operational_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: varchar("type", { length: 40 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    status: documentStatus("status").notNull().default("DRAFT"),
    formulaVersion: varchar("formula_version", { length: 100 }),
    data: jsonb("data")
      .notNull()
      .default(sql`'{}'::jsonb`),
    revision: varchar("revision", { length: 20 }).notNull().default("1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [index("operational_documents_status_idx").on(table.status)],
);

export const systemLogs = pgTable(
  "system_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    action: varchar("action", { length: 60 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: uuid("entity_id"),
    correlationId: uuid("correlation_id").notNull().defaultRandom(),
    sourceAddress: varchar("source_address", { length: 64 }),
    userAgent: text("user_agent"),
    changes: jsonb("changes")
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    index("system_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);
