import { bigint, boolean, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

// Better Auth core tables — keep in sync with @better-auth/cli generate
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: ts("created_at").defaultNow().notNull(),
  updatedAt: ts("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: ts("created_at").defaultNow().notNull(),
  updatedAt: ts("updated_at").$onUpdate(() => new Date()).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("created_at").defaultNow().notNull(),
  updatedAt: ts("updated_at").$onUpdate(() => new Date()).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").defaultNow().notNull(),
  updatedAt: ts("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const rateLimit = pgTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("lastRequest", { mode: "number" }).notNull(),
});

// App tables
export const alert = pgTable(
  "alert",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    phrase: text("phrase").notNull(),
    key: text("key").notNull(),
    createdAt: ts("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.key)],
);

export const act = pgTable("act", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  organ: text("organ"),
  section: text("section").notNull(),
  pubDate: text("pub_date").notNull(),
  excerpt: text("excerpt").notNull(),
  url: text("url").notNull(),
  firstSeenAt: ts("first_seen_at").defaultNow().notNull(),
});

export const match = pgTable(
  "match",
  {
    alertId: uuid("alert_id").notNull().references(() => alert.id, { onDelete: "cascade" }),
    actSlug: text("act_slug").notNull().references(() => act.slug, { onDelete: "cascade" }),
    createdAt: ts("created_at").defaultNow().notNull(),
    notifiedAt: ts("notified_at"),
  },
  (t) => [
    primaryKey({ columns: [t.alertId, t.actSlug] }),
    index("match_act_slug_idx").on(t.actSlug),
    index("match_created_at_idx").on(t.createdAt),
  ],
);

export const phraseCheck = pgTable("phrase_check", {
  key: text("key").primaryKey(),
  checkedAt: ts("checked_at").notNull(),
});

export const pushToken = pgTable("push_token", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: ts("created_at").defaultNow().notNull(),
});
