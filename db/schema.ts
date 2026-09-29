import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tz = (name: string) => timestamp(name, { withTimezone: true });

// ── Better Auth (core schema) ───────────────────────────────────────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: tz("created_at").notNull().defaultNow(),
  updatedAt: tz("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: tz("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: tz("access_token_expires_at"),
    refreshTokenExpiresAt: tz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: tz("expires_at").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ── 서비스 ──────────────────────────────────────────────────────────────────
export const postings = pgTable(
  "postings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    sourceId: text("source_id").notNull(),
    company: text("company").notNull(),
    title: text("title").notNull(),
    careerType: text("career_type", { enum: ["new", "experienced", "any"] }).notNull(),
    regions: text("regions").array().notNull().default(sql`'{}'`),
    jobCategories: text("job_categories").array().notNull().default(sql`'{}'`),
    openedAt: tz("opened_at"),
    deadlineAt: tz("deadline_at"),
    deadlineTimeKnown: boolean("deadline_time_known").notNull().default(false),
    url: text("url").notNull(),
    firstSeenAt: tz("first_seen_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("postings_source_uq").on(t.source, t.sourceId), index("postings_deadline_idx").on(t.deadlineAt)],
);

export const subscriptions = pgTable("subscriptions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  keywords: text("keywords").array().notNull().default(sql`'{}'`),
  careerType: text("career_type", { enum: ["new", "experienced", "any"] }).notNull().default("any"),
  regions: text("regions").array().notNull().default(sql`'{}'`),
  companies: text("companies").array().notNull().default(sql`'{}'`),
  updatedAt: tz("updated_at").notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  telegramChatId: text("telegram_chat_id").unique(),
  /** 텔레그램 딥링크 /start <token> 으로 계정 연결 */
  telegramLinkToken: text("telegram_link_token").notNull().unique(),
  /** 캘린더 구독 URL용 비밀 토큰 */
  calendarToken: text("calendar_token").notNull().unique(),
});

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postingId: uuid("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postingId] })],
);

export const notificationJobs = pgTable(
  "notification_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postingId: uuid("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["new", "D-3", "D-1", "D-0"] }).notNull(),
    sendAt: tz("send_at").notNull(),
    status: text("status", { enum: ["pending", "sending", "sent", "failed", "canceled"] })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    claimedAt: tz("claimed_at"),
    sentAt: tz("sent_at"),
    lastError: text("last_error"),
  },
  (t) => [
    uniqueIndex("notification_jobs_uq").on(t.userId, t.postingId, t.kind),
    index("notification_jobs_due_idx").on(t.status, t.sendAt),
  ],
);
