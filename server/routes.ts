// Reference: javascript_websocket blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { botManager } from "./botManager";
import { 
  insertUserSchema, 
  loginSchema, 
  adminLoginSchema,
  changeAdminPasswordSchema,
  updateRepoMessageSchema,
  bulkMessageSchema,
  updateOwnerNumberSchema,
  updateBotModeSchema,
  updateKeepAliveSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe' && data.userId) {
          userId = data.userId;
          botManager.addWebSocketConnection(userId, ws);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        botManager.removeWebSocketConnection(userId, ws);
      }
    });
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const user = await storage.createUser(data);
      
      // Create bot session for user
      await storage.createBotSession({
        userId: user.id,
        status: "inactive",
        qrCode: null,
        ownerNumber: null,
        connectedNumber: null,
        botMode: "private",
        keepAliveEnabled: true,
      });

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsernameAndPassword(data.username, data.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Bot routes
  app.get("/api/bot/session", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const session = await storage.getBotSession(userId);
      res.json(session || {});
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bot/generate-qr", async (req, res) => {
    try {
      const userId = req.body.userId || req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await botManager.generateQR(userId);
      res.json({ message: "QR code generation started" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bot/start", async (req, res) => {
    try {
      const userId = req.body.userId || req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await botManager.startBot(userId);
      res.json({ message: "Bot started successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bot/stop", async (req, res) => {
    try {
      const userId = req.body.userId || req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await botManager.stopBot(userId);
      res.json({ message: "Bot stopped successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bot/owner", async (req, res) => {
    try {
      const userId = req.body.userId || req.query.userId as string;
      const data = updateOwnerNumberSchema.parse(req.body);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await storage.updateBotSession(userId, {
        ownerNumber: data.ownerNumber || null,
      });

      res.json({ message: "Owner number updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bot/logs", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const session = await storage.getBotSession(userId);
      if (!session) {
        return res.json([]);
      }

      const logs = await storage.getBotLogs(session.id);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bot/contacts", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const session = await storage.getBotSession(userId);
      if (!session) {
        return res.json([]);
      }

      const contacts = await storage.getExtractedContacts(session.id);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bot/contacts/download/:id", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const contactId = req.params.id;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const session = await storage.getBotSession(userId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const contacts = await storage.getExtractedContacts(session.id);
      const contactGroup = contacts.find(c => c.id === contactId);
      
      if (!contactGroup) {
        return res.status(404).json({ message: "Contacts not found" });
      }

      const csv = `Group Name,Phone Number,Extracted Date\n${contactGroup.contacts.map(num => `"${contactGroup.groupName}","${num}","${new Date(contactGroup.createdAt).toISOString()}"`).join('\n')}`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${contactGroup.groupName.replace(/[^a-z0-9]/gi, '_')}_contacts.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bot/mode", async (req, res) => {
    try {
      const userId = req.body.userId || req.query.userId as string;
      const data = updateBotModeSchema.parse(req.body);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await storage.updateBotSession(userId, {
        botMode: data.botMode,
      });

      res.json({ message: "Bot mode updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bot/keepalive", async (req, res) => {
    try {
      const userId = req.body.userId || req.query.userId as string;
      const data = updateKeepAliveSchema.parse(req.body);
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await storage.updateBotSession(userId, {
        keepAliveEnabled: data.keepAliveEnabled,
      });

      res.json({ message: "Keep-alive setting updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const data = adminLoginSchema.parse(req.body);
      
      const settings = await storage.initializeAdminSettings();
      
      if (data.password !== settings.password) {
        return res.status(401).json({ message: "Invalid password" });
      }

      res.json({ message: "Access granted" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const data = changeAdminPasswordSchema.parse(req.body);
      
      const settings = await storage.getAdminSettings();
      if (!settings || data.currentPassword !== settings.password) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      await storage.updateAdminSettings({ password: data.newPassword });
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/settings", async (req, res) => {
    try {
      const settings = await storage.initializeAdminSettings();
      res.json({ repoUrl: settings.repoUrl, repoMessage: settings.repoMessage });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    try {
      const data = updateRepoMessageSchema.parse(req.body);
      await storage.updateAdminSettings(data);
      res.json({ message: "Settings updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/bulk-message", async (req, res) => {
    try {
      const data = bulkMessageSchema.parse(req.body);
      
      if (data.targetType === "connected") {
        const users = await storage.getAllUsers();
        const recipients = users
          .filter(u => u.connectedNumber)
          .map(u => u.connectedNumber as string);
        
        await botManager.sendBulkMessage(recipients, data.message, data.imageUrl);
        
        res.json({ 
          message: "Bulk message sent successfully to connected numbers",
          recipientCount: recipients.length 
        });
      } else {
        const allContacts = await storage.getAllExtractedContacts();
        const contactsByUser = new Map<string, Set<string>>();
        
        allContacts.forEach((contact: any) => {
          if (!contactsByUser.has(contact.userId)) {
            contactsByUser.set(contact.userId, new Set());
          }
          contact.contacts.forEach((num: string) => {
            contactsByUser.get(contact.userId)!.add(num);
          });
        });

        let totalSent = 0;
        let successCount = 0;
        let failCount = 0;

        for (const [userId, contactSet] of Array.from(contactsByUser.entries())) {
          const recipients = Array.from(contactSet);
          try {
            await botManager.sendBulkMessageFromUser(userId, recipients, data.message, data.imageUrl);
            totalSent += recipients.length;
            successCount++;
          } catch (error: any) {
            console.error(`Failed to send bulk message for user ${userId}:`, error.message);
            failCount++;
          }
        }

        res.json({ 
          message: `Bulk message sent from ${successCount} bots to their extracted contacts`,
          recipientCount: totalSent,
          successfulBots: successCount,
          failedBots: failCount
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const activeBots = users.filter(u => u.botStatus === 'active').length;
      
      let totalLogs = 0;
      for (const user of users) {
        const session = await storage.getBotSession(user.id);
        if (session) {
          const logs = await storage.getBotLogs(session.id);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayLogs = logs.filter(l => new Date(l.createdAt) >= today);
          totalLogs += todayLogs.length;
        }
      }

      res.json({
        totalUsers: users.length,
        activeBots,
        messagesToday: totalLogs,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/bot/start", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await botManager.startBot(userId);
      res.json({ message: "Bot started successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/bot/stop", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await botManager.stopBot(userId);
      res.json({ message: "Bot stopped successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/contacts", async (req, res) => {
    try {
      const allContacts = await storage.getAllExtractedContacts();
      res.json(allContacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/contacts/download", async (req, res) => {
    try {
      const allContacts = await storage.getAllExtractedContacts();
      
      let csvContent = "User,Group Name,Phone Number,Extracted Date\n";
      for (const contact of allContacts) {
        for (const num of contact.contacts) {
          csvContent += `"${contact.username}","${contact.groupName}","${num}","${new Date(contact.createdAt).toISOString()}"\n`;
        }
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="all_contacts.csv"');
      res.send(csvContent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Premium user management routes
  app.get("/api/admin/premium-users", async (req, res) => {
    try {
      const premiumUsers = await storage.getAllPremiumUsers();
      const usersWithDetails = await Promise.all(premiumUsers.map(async (premium) => {
        const user = await storage.getUser(premium.userId);
        return {
          ...premium,
          username: user?.username,
          email: user?.email,
        };
      }));
      res.json(usersWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/premium-users/add", async (req, res) => {
    try {
      const data = req.body;
      await storage.upsertPremiumUser(data.userId, data.hours);
      res.json({ message: "Premium access granted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/premium-users/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      await storage.deletePremiumUser(userId);
      res.json({ message: "Premium access revoked successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/admin-number", async (req, res) => {
    try {
      const { adminNumber } = req.body;
      await storage.updateAdminSettings({ adminNumber });
      res.json({ message: "Admin number updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/admin-number", async (req, res) => {
    try {
      const settings = await storage.getAdminSettings();
      res.json({ adminNumber: settings?.adminNumber || null });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User bulk messaging routes
  app.get("/api/bulk-messaging/status", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const isPremium = await storage.isPremiumActive(userId);
      const premiumData = await storage.getPremiumUser(userId);
      
      res.json({
        isPremium,
        premiumUntil: premiumData?.premiumUntil || null,
        maxRecipients: isPremium ? -1 : 5,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bulk-messaging/send", async (req, res) => {
    try {
      const userId = req.body.userId || req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const { message, recipientNumbers, image } = req.body;
      
      if (!message || !recipientNumbers || recipientNumbers.length === 0) {
        return res.status(400).json({ message: "Message and recipients required" });
      }

      const isPremium = await storage.isPremiumActive(userId);
      const maxRecipients = isPremium ? Infinity : 5;

      if (recipientNumbers.length > maxRecipients) {
        return res.status(400).json({ 
          message: `You can only send to ${maxRecipients} recipients. Upgrade to premium for unlimited messaging.` 
        });
      }

      const session = await storage.getBotSession(userId);
      if (!session) {
        return res.status(404).json({ message: "Bot session not found" });
      }

      await botManager.sendBulkMessageFromUser(userId, recipientNumbers, message, image);

      await storage.createBotLog({
        sessionId: session.id,
        message: `Sent bulk message to ${recipientNumbers.length} recipients`,
        type: "command",
      });

      res.json({ 
        message: "Bulk message sent successfully",
        recipientCount: recipientNumbers.length 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
