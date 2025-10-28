// Reference: javascript_database blueprint
import { 
  users, 
  botSessions,
  botLogs,
  extractedContacts,
  groupSettings,
  linkWarnings,
  adminSettings,
  bannedUsers,
  type User, 
  type InsertUser,
  type BotSession,
  type InsertBotSession,
  type BotLog,
  type InsertBotLog,
  type ExtractedContacts,
  type InsertExtractedContacts,
  type GroupSettings,
  type InsertGroupSettings,
  type LinkWarnings,
  type InsertLinkWarnings,
  type AdminSettings,
  type InsertAdminSettings,
  type BannedUser,
  type InsertBannedUser,
  premiumUsers,
  type PremiumUser,
  type InsertPremiumUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameAndPassword(username: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<any[]>;

  // Bot session operations
  getBotSession(userId: string): Promise<BotSession | undefined>;
  createBotSession(session: InsertBotSession): Promise<BotSession>;
  updateBotSession(userId: string, updates: Partial<BotSession>): Promise<void>;
  
  // Bot logs operations
  createBotLog(log: InsertBotLog): Promise<BotLog>;
  getBotLogs(sessionId: string): Promise<BotLog[]>;

  // Extracted contacts operations
  createExtractedContacts(contacts: InsertExtractedContacts): Promise<ExtractedContacts>;
  getExtractedContacts(sessionId: string): Promise<ExtractedContacts[]>;
  getAllExtractedContacts(): Promise<any[]>;

  // Group settings operations
  getGroupSettings(sessionId: string, groupId: string): Promise<GroupSettings | undefined>;
  upsertGroupSettings(settings: Partial<InsertGroupSettings> & { sessionId: string; groupId: string; groupName: string }): Promise<GroupSettings>;

  // Link warnings operations
  getLinkWarning(groupSettingsId: string, userNumber: string): Promise<LinkWarnings | undefined>;
  upsertLinkWarning(warning: Partial<InsertLinkWarnings> & { groupSettingsId: string; userNumber: string }): Promise<LinkWarnings>;

  // Admin settings operations
  getAdminSettings(): Promise<AdminSettings | undefined>;
  initializeAdminSettings(): Promise<AdminSettings>;
  updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings>;

  // Banned users operations
  getBannedUser(groupSettingsId: string, userNumber: string): Promise<BannedUser | undefined>;
  createBannedUser(user: InsertBannedUser): Promise<BannedUser>;
  deleteBannedUser(groupSettingsId: string, userNumber: string): Promise<void>;
  getGroupBannedUsers(groupSettingsId: string): Promise<BannedUser[]>;

  // Premium users operations
  getPremiumUser(userId: string): Promise<PremiumUser | undefined>;
  upsertPremiumUser(userId: string, hours: number): Promise<PremiumUser>;
  deletePremiumUser(userId: string): Promise<void>;
  getAllPremiumUsers(): Promise<PremiumUser[]>;
  isPremiumActive(userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByUsernameAndPassword(username: string, password: string): Promise<User | undefined> {
    const hashedPassword = hashPassword(password);
    const [user] = await db
      .select()
      .from(users)
      .where(sql`${users.username} = ${username} AND ${users.password} = ${hashedPassword}`);
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = hashPassword(insertUser.password);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<any[]> {
    const result = await db
      .select({
        id: users.id,
        botName: users.botName,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt,
        botStatus: botSessions.status,
        connectedNumber: botSessions.connectedNumber,
      })
      .from(users)
      .leftJoin(botSessions, eq(users.id, botSessions.userId));
    return result;
  }

  // Bot session operations
  async getBotSession(userId: string): Promise<BotSession | undefined> {
    const [session] = await db
      .select()
      .from(botSessions)
      .where(eq(botSessions.userId, userId));
    return session || undefined;
  }

  async createBotSession(insertSession: InsertBotSession): Promise<BotSession> {
    const [session] = await db
      .insert(botSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateBotSession(userId: string, updates: Partial<BotSession>): Promise<void> {
    await db
      .update(botSessions)
      .set(updates)
      .where(eq(botSessions.userId, userId));
  }

  // Bot logs operations
  async createBotLog(insertLog: InsertBotLog): Promise<BotLog> {
    const [log] = await db
      .insert(botLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getBotLogs(sessionId: string): Promise<BotLog[]> {
    const logs = await db
      .select()
      .from(botLogs)
      .where(eq(botLogs.sessionId, sessionId))
      .orderBy(desc(botLogs.createdAt))
      .limit(100);
    return logs;
  }

  // Extracted contacts operations
  async createExtractedContacts(insertContacts: InsertExtractedContacts): Promise<ExtractedContacts> {
    const [contacts] = await db
      .insert(extractedContacts)
      .values(insertContacts)
      .returning();
    return contacts;
  }

  async getExtractedContacts(sessionId: string): Promise<ExtractedContacts[]> {
    const contacts = await db
      .select()
      .from(extractedContacts)
      .where(eq(extractedContacts.sessionId, sessionId))
      .orderBy(desc(extractedContacts.createdAt));
    return contacts;
  }

  async getAllExtractedContacts(): Promise<any[]> {
    const contacts = await db
      .select({
        id: extractedContacts.id,
        groupName: extractedContacts.groupName,
        contacts: extractedContacts.contacts,
        createdAt: extractedContacts.createdAt,
        username: users.username,
        userId: users.id,
      })
      .from(extractedContacts)
      .leftJoin(botSessions, eq(extractedContacts.sessionId, botSessions.id))
      .leftJoin(users, eq(botSessions.userId, users.id))
      .orderBy(desc(extractedContacts.createdAt));
    return contacts;
  }

  // Group settings operations
  async getGroupSettings(sessionId: string, groupId: string): Promise<GroupSettings | undefined> {
    const [settings] = await db
      .select()
      .from(groupSettings)
      .where(and(
        eq(groupSettings.sessionId, sessionId),
        eq(groupSettings.groupId, groupId)
      ));
    return settings || undefined;
  }

  async upsertGroupSettings(settings: Partial<InsertGroupSettings> & { sessionId: string; groupId: string; groupName: string }): Promise<GroupSettings> {
    const existing = await this.getGroupSettings(settings.sessionId, settings.groupId);
    
    if (existing) {
      const [updated] = await db
        .update(groupSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(and(
          eq(groupSettings.sessionId, settings.sessionId),
          eq(groupSettings.groupId, settings.groupId)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(groupSettings)
        .values(settings as InsertGroupSettings)
        .returning();
      return created;
    }
  }

  // Link warnings operations
  async getLinkWarning(groupSettingsId: string, userNumber: string): Promise<LinkWarnings | undefined> {
    const [warning] = await db
      .select()
      .from(linkWarnings)
      .where(and(
        eq(linkWarnings.groupSettingsId, groupSettingsId),
        eq(linkWarnings.userNumber, userNumber)
      ));
    return warning || undefined;
  }

  async upsertLinkWarning(warning: Partial<InsertLinkWarnings> & { groupSettingsId: string; userNumber: string }): Promise<LinkWarnings> {
    const existing = await this.getLinkWarning(warning.groupSettingsId, warning.userNumber);
    
    if (existing) {
      const [updated] = await db
        .update(linkWarnings)
        .set(warning)
        .where(and(
          eq(linkWarnings.groupSettingsId, warning.groupSettingsId),
          eq(linkWarnings.userNumber, warning.userNumber)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(linkWarnings)
        .values(warning as InsertLinkWarnings)
        .returning();
      return created;
    }
  }

  // Admin settings operations
  async getAdminSettings(): Promise<AdminSettings | undefined> {
    const [settings] = await db.select().from(adminSettings).limit(1);
    return settings || undefined;
  }

  async initializeAdminSettings(): Promise<AdminSettings> {
    const existing = await this.getAdminSettings();
    if (existing) {
      return existing;
    }
    const [settings] = await db
      .insert(adminSettings)
      .values({})
      .returning();
    return settings;
  }

  async updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
    const existing = await this.getAdminSettings();
    if (!existing) {
      return await this.initializeAdminSettings();
    }
    const [updated] = await db
      .update(adminSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminSettings.id, existing.id))
      .returning();
    return updated;
  }

  // Banned users operations
  async getBannedUser(groupSettingsId: string, userNumber: string): Promise<BannedUser | undefined> {
    const [user] = await db
      .select()
      .from(bannedUsers)
      .where(and(
        eq(bannedUsers.groupSettingsId, groupSettingsId),
        eq(bannedUsers.userNumber, userNumber)
      ));
    return user || undefined;
  }

  async createBannedUser(user: InsertBannedUser): Promise<BannedUser> {
    const [created] = await db
      .insert(bannedUsers)
      .values(user)
      .returning();
    return created;
  }

  async deleteBannedUser(groupSettingsId: string, userNumber: string): Promise<void> {
    await db
      .delete(bannedUsers)
      .where(and(
        eq(bannedUsers.groupSettingsId, groupSettingsId),
        eq(bannedUsers.userNumber, userNumber)
      ));
  }

  async getGroupBannedUsers(groupSettingsId: string): Promise<BannedUser[]> {
    const users = await db
      .select()
      .from(bannedUsers)
      .where(eq(bannedUsers.groupSettingsId, groupSettingsId));
    return users;
  }

  // Premium users operations
  async getPremiumUser(userId: string): Promise<PremiumUser | undefined> {
    const [user] = await db
      .select()
      .from(premiumUsers)
      .where(eq(premiumUsers.userId, userId));
    return user || undefined;
  }

  async upsertPremiumUser(userId: string, hours: number): Promise<PremiumUser> {
    const premiumUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    const existing = await this.getPremiumUser(userId);
    
    if (existing) {
      const [updated] = await db
        .update(premiumUsers)
        .set({ premiumUntil, updatedAt: new Date() })
        .where(eq(premiumUsers.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(premiumUsers)
        .values({ userId, premiumUntil })
        .returning();
      return created;
    }
  }

  async deletePremiumUser(userId: string): Promise<void> {
    await db
      .delete(premiumUsers)
      .where(eq(premiumUsers.userId, userId));
  }

  async getAllPremiumUsers(): Promise<PremiumUser[]> {
    const users = await db
      .select()
      .from(premiumUsers)
      .orderBy(desc(premiumUsers.premiumUntil));
    return users;
  }

  async isPremiumActive(userId: string): Promise<boolean> {
    const premium = await this.getPremiumUser(userId);
    if (!premium) return false;
    return new Date() < new Date(premium.premiumUntil);
  }
}

export const storage = new DatabaseStorage();
