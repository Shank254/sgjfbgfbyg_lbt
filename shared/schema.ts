import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table - stores user registration info
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  botName: text("bot_name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Bot sessions table - stores WhatsApp bot instances
export const botSessions = pgTable("bot_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default("inactive"), // inactive, connecting, active, error
  qrCode: text("qr_code"),
  ownerNumber: text("owner_number"),
  connectedNumber: text("connected_number"),
  botMode: text("bot_mode").notNull().default("private"), // private, public - controls who can use bot commands
  keepAliveEnabled: boolean("keep_alive_enabled").notNull().default(true), // keep bot alive on free hosting
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Bot logs table - stores bot activity
export const botLogs = pgTable("bot_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => botSessions.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, success, error, command
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Extracted contacts table - stores numbers extracted from groups
export const extractedContacts = pgTable("extracted_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => botSessions.id, { onDelete: 'cascade' }),
  groupName: text("group_name").notNull(),
  contacts: text("contacts").array().notNull(), // Array of phone numbers
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Group settings table - stores group-specific configurations
export const groupSettings = pgTable("group_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => botSessions.id, { onDelete: 'cascade' }),
  groupId: text("group_id").notNull(),
  groupName: text("group_name").notNull(),
  antiLinkMode: text("anti_link_mode").default("off"), // off, on, warn
  antiViewOnce: boolean("anti_view_once").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Link warnings table - tracks warnings per user per group
export const linkWarnings = pgTable("link_warnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupSettingsId: varchar("group_settings_id").notNull().references(() => groupSettings.id, { onDelete: 'cascade' }),
  userNumber: text("user_number").notNull(),
  warningCount: text("warning_count").notNull().default("0"),
  lastWarning: timestamp("last_warning"),
});

// Admin settings table - stores admin password and global settings
export const adminSettings = pgTable("admin_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  password: text("password").notNull().default("1234"),
  adminNumber: text("admin_number"),
  repoUrl: text("repo_url").default("https://github.com/yourusername/whatsapp-bot"),
  repoMessage: text("repo_message").default("🌟 *WhatsApp Bot Repository* 🌟\n\nThank you for using our bot!\n\n🔗 GitHub: https://github.com/yourusername/whatsapp-bot\n\n💡 Feel free to star the repo and contribute!\n\n✨ Happy coding! ✨"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Banned users table - tracks banned users in groups
export const bannedUsers = pgTable("banned_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupSettingsId: varchar("group_settings_id").notNull().references(() => groupSettings.id, { onDelete: 'cascade' }),
  userNumber: text("user_number").notNull(),
  reason: text("reason").notNull(),
  bannedAt: timestamp("banned_at").notNull().defaultNow(),
});

// Premium users table - tracks users with premium bulk messaging access
export const premiumUsers = pgTable("premium_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  premiumUntil: timestamp("premium_until").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  botSession: one(botSessions, {
    fields: [users.id],
    references: [botSessions.userId],
  }),
}));

export const botSessionsRelations = relations(botSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [botSessions.userId],
    references: [users.id],
  }),
  logs: many(botLogs),
  contacts: many(extractedContacts),
  groupSettings: many(groupSettings),
}));

export const botLogsRelations = relations(botLogs, ({ one }) => ({
  session: one(botSessions, {
    fields: [botLogs.sessionId],
    references: [botSessions.id],
  }),
}));

export const extractedContactsRelations = relations(extractedContacts, ({ one }) => ({
  session: one(botSessions, {
    fields: [extractedContacts.sessionId],
    references: [botSessions.id],
  }),
}));

export const groupSettingsRelations = relations(groupSettings, ({ one, many }) => ({
  session: one(botSessions, {
    fields: [groupSettings.sessionId],
    references: [botSessions.id],
  }),
  warnings: many(linkWarnings),
  bannedUsers: many(bannedUsers),
}));

export const linkWarningsRelations = relations(linkWarnings, ({ one }) => ({
  groupSettings: one(groupSettings, {
    fields: [linkWarnings.groupSettingsId],
    references: [groupSettings.id],
  }),
}));

export const bannedUsersRelations = relations(bannedUsers, ({ one }) => ({
  groupSettings: one(groupSettings, {
    fields: [bannedUsers.groupSettingsId],
    references: [groupSettings.id],
  }),
}));

export const premiumUsersRelations = relations(premiumUsers, ({ one }) => ({
  user: one(users, {
    fields: [premiumUsers.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertBotSessionSchema = createInsertSchema(botSessions).omit({
  id: true,
  createdAt: true,
  lastActive: true,
});

export const insertBotLogSchema = createInsertSchema(botLogs).omit({
  id: true,
  createdAt: true,
});

export const insertExtractedContactsSchema = createInsertSchema(extractedContacts).omit({
  id: true,
  createdAt: true,
});

export const insertGroupSettingsSchema = createInsertSchema(groupSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLinkWarningsSchema = createInsertSchema(linkWarnings).omit({
  id: true,
});

export const insertAdminSettingsSchema = createInsertSchema(adminSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertBannedUserSchema = createInsertSchema(bannedUsers).omit({
  id: true,
  bannedAt: true,
});

export const insertPremiumUserSchema = createInsertSchema(premiumUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Admin login schema
export const adminLoginSchema = z.object({
  password: z.string().min(4, "Password must be at least 4 characters"),
});

// Admin change password schema
export const changeAdminPasswordSchema = z.object({
  currentPassword: z.string().min(4, "Current password required"),
  newPassword: z.string().min(4, "New password must be at least 4 characters"),
});

// Update repo message schema
export const updateRepoMessageSchema = z.object({
  repoUrl: z.string().optional(),
  repoMessage: z.string().optional(),
});

// Add premium user schema
export const addPremiumUserSchema = z.object({
  userId: z.string(),
  hours: z.number().min(1, "Hours must be at least 1"),
});

// Bulk message with image schema
export const bulkMessageWithImageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  recipientNumbers: z.array(z.string()).min(1, "At least one recipient required"),
  image: z.string().optional(),
});

// Bulk message schema
export const bulkMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  imageUrl: z.string().optional(),
  targetType: z.enum(["connected", "extracted"]),
});

// Update owner number schema
export const updateOwnerNumberSchema = z.object({
  ownerNumber: z.string().optional(),
});

// Update bot mode schema
export const updateBotModeSchema = z.object({
  botMode: z.enum(["private", "public"]),
});

// Update keep alive schema
export const updateKeepAliveSchema = z.object({
  keepAliveEnabled: z.boolean(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBotSession = z.infer<typeof insertBotSessionSchema>;
export type BotSession = typeof botSessions.$inferSelect;

export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type BotLog = typeof botLogs.$inferSelect;

export type InsertExtractedContacts = z.infer<typeof insertExtractedContactsSchema>;
export type ExtractedContacts = typeof extractedContacts.$inferSelect;

export type InsertGroupSettings = z.infer<typeof insertGroupSettingsSchema>;
export type GroupSettings = typeof groupSettings.$inferSelect;

export type InsertLinkWarnings = z.infer<typeof insertLinkWarningsSchema>;
export type LinkWarnings = typeof linkWarnings.$inferSelect;

export type InsertAdminSettings = z.infer<typeof insertAdminSettingsSchema>;
export type AdminSettings = typeof adminSettings.$inferSelect;

export type InsertBannedUser = z.infer<typeof insertBannedUserSchema>;
export type BannedUser = typeof bannedUsers.$inferSelect;

export type InsertPremiumUser = z.infer<typeof insertPremiumUserSchema>;
export type PremiumUser = typeof premiumUsers.$inferSelect;

export type LoginData = z.infer<typeof loginSchema>;
export type AdminLoginData = z.infer<typeof adminLoginSchema>;
export type ChangeAdminPasswordData = z.infer<typeof changeAdminPasswordSchema>;
export type UpdateRepoMessageData = z.infer<typeof updateRepoMessageSchema>;
export type BulkMessageData = z.infer<typeof bulkMessageSchema>;
export type UpdateOwnerNumberData = z.infer<typeof updateOwnerNumberSchema>;
export type UpdateBotModeData = z.infer<typeof updateBotModeSchema>;
export type UpdateKeepAliveData = z.infer<typeof updateKeepAliveSchema>;
export type AddPremiumUserData = z.infer<typeof addPremiumUserSchema>;
export type BulkMessageWithImageData = z.infer<typeof bulkMessageWithImageSchema>;
