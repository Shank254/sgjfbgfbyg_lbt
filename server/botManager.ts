import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import QRCode from 'qrcode';
import { storage } from './storage';
import type { WebSocket } from 'ws';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface BotInstance {
  client: any;
  userId: string;
  sessionId: string;
  qrAttempts: number;
  keepAliveInterval?: NodeJS.Timeout;
}

class BotManager {
  private bots: Map<string, BotInstance> = new Map();
  private wsConnections: Map<string, WebSocket[]> = new Map();

  async addWebSocketConnection(userId: string, ws: WebSocket) {
    if (!this.wsConnections.has(userId)) {
      this.wsConnections.set(userId, []);
    }
    this.wsConnections.get(userId)!.push(ws);
  }

  removeWebSocketConnection(userId: string, ws: WebSocket) {
    const connections = this.wsConnections.get(userId);
    if (connections) {
      const index = connections.indexOf(ws);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        this.wsConnections.delete(userId);
      }
    }
  }

  private sendToUser(userId: string, message: any) {
    const connections = this.wsConnections.get(userId);
    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws.readyState === 1) {
          ws.send(messageStr);
        }
      });
    }
  }

  private startKeepAlive(botInstance: BotInstance, userId: string) {
    if (botInstance.keepAliveInterval) {
      clearInterval(botInstance.keepAliveInterval);
    }

    botInstance.keepAliveInterval = setInterval(async () => {
      try {
        const session = await storage.getBotSession(userId);
        if (session?.keepAliveEnabled && botInstance.client) {
          const state = await botInstance.client.getState();
          if (state !== 'CONNECTED') {
            console.log(`Keep-alive: Reconnecting bot for user ${userId}`);
            await this.generateQR(userId);
          } else {
            await storage.updateBotSession(userId, {
              lastActive: new Date(),
            });
          }
        }
      } catch (error) {
        console.error('Keep-alive error:', error);
      }
    }, 5 * 60 * 1000);
  }

  async generateQR(userId: string): Promise<void> {
    await this.stopBot(userId);

    let session = await storage.getBotSession(userId);
    if (!session) {
      session = await storage.createBotSession({
        userId,
        status: "connecting",
        qrCode: null,
        ownerNumber: null,
        connectedNumber: null,
        botMode: "private",
        keepAliveEnabled: true,
      });
    } else {
      await storage.updateBotSession(userId, {
        status: "connecting",
        qrCode: null,
      });
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }),
      puppeteer: {
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    const botInstance: BotInstance = {
      client,
      userId,
      sessionId: session.id,
      qrAttempts: 0,
    };

    this.bots.set(userId, botInstance);

    client.on('qr', async (qr) => {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr);
        await storage.updateBotSession(userId, {
          qrCode: qrDataUrl,
          status: "connecting",
        });
        
        this.sendToUser(userId, {
          type: "qr",
          qrCode: qrDataUrl,
        });

        botInstance.qrAttempts++;
        if (botInstance.qrAttempts > 3) {
          await this.stopBot(userId);
        }
      } catch (error) {
        console.error('QR generation error:', error);
      }
    });

    client.on('ready', async () => {
      const info = client.info;
      const connectedNumber = info?.wid?.user || 'Unknown';

      const session = await storage.getBotSession(userId);
      if (session) {
        await storage.updateBotSession(userId, {
          status: "active",
          connectedNumber: `+${connectedNumber}`,
          qrCode: null,
          lastActive: new Date(),
        });

        await storage.createBotLog({
          sessionId: session.id,
          message: `Bot connected successfully as +${connectedNumber}`,
          type: "success",
        });

        this.sendToUser(userId, {
          type: "status",
          status: "active",
          connectedNumber: `+${connectedNumber}`,
        });

        const welcomeMessage = `
╔══════════════════════════╗
║  🤖 *BOT CONNECTED!* 🤖  ║
╚══════════════════════════╝

✨ *Welcome to Your WhatsApp Bot!* ✨

🎉 *Your bot is now active and ready!*
📱 Connected as: *+${connectedNumber}*

━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *Quick Start Guide:*

Type *menu* or *.menu* to see all available commands!

🔐 *Security Notice:*
Your bot is currently in *${session.botMode.toUpperCase()}* mode
${session.botMode === 'private' ? '🔒 Only you and the bot owner can use commands' : '🌐 Anyone can use bot commands'}

━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *Pro Tip:* 
Set your owner number in the dashboard to enable command authorization!

━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Happy botting! 🚀
        `.trim();

        if (session.ownerNumber) {
          try {
            const chatId = session.ownerNumber.replace('+', '') + '@c.us';
            await client.sendMessage(chatId, welcomeMessage);
          } catch (error) {
            console.error('Error sending welcome message:', error);
          }
        }

        if (session.keepAliveEnabled) {
          this.startKeepAlive(botInstance, userId);
        }
      }
    });

    client.on('message', async (message) => {
      await this.handleCommand(userId, message);
    });

    client.on('message_create', async (message) => {
      const session = await storage.getBotSession(userId);
      if (!session) return;

      const chat = await message.getChat();
      if (chat.isGroup) {
        const contact = await message.getContact();
        const senderNumber = '+' + contact.id.user;
        const groupSettings = await storage.getGroupSettings(session.id, chat.id._serialized);
        
        if (groupSettings) {
          const bannedUser = await storage.getBannedUser(groupSettings.id, senderNumber);
          if (bannedUser && !message.fromMe) {
            try {
              await message.delete(true);
              const mentions = [contact];
              await chat.sendMessage(`🚫 *User Banned*\n\n@${contact.id.user}, you are banned from sending messages.\n\n*Reason:* ${bannedUser.reason}`, {
                mentions: mentions as any
              });
            } catch (error) {
              console.error('Error deleting banned user message:', error);
            }
            return;
          }

          if (groupSettings.antiViewOnce && message.hasMedia && message.type === 'image' && (message as any).isViewOnce) {
            try {
              const media = await message.downloadMedia();
              if (media) {
                await chat.sendMessage(media, {
                  caption: `🔓 *Anti-View-Once*\n\nThis view-once media has been saved for transparency.`,
                });
                
                await storage.createBotLog({
                  sessionId: session.id,
                  message: `Anti-view-once: Saved view-once media in ${chat.name}`,
                  type: "command",
                });
              }
            } catch (error) {
              console.error('Anti-view-once error:', error);
            }
          }
        }
      }
    });

    client.on('disconnected', async (reason) => {
      const session = await storage.getBotSession(userId);
      if (session) {
        await storage.updateBotSession(userId, {
          status: "inactive",
        });

        await storage.createBotLog({
          sessionId: session.id,
          message: `Bot disconnected: ${reason}`,
          type: "error",
        });
      }

      this.sendToUser(userId, {
        type: "status",
        status: "inactive",
      });

      if (botInstance.keepAliveInterval) {
        clearInterval(botInstance.keepAliveInterval);
      }

      this.bots.delete(userId);
    });

    try {
      await client.initialize();
    } catch (error) {
      console.error('Bot initialization error:', error);
      await storage.updateBotSession(userId, {
        status: "error",
      });
      this.bots.delete(userId);
    }
  }

  async handleCommand(userId: string, message: any) {
    const session = await storage.getBotSession(userId);
    if (!session) return;

    const body = message.body.trim();
    const bodyLower = body.toLowerCase();
    const chat = await message.getChat();
    const contact = await message.getContact();
    const senderNumber = '+' + contact.id.user;

    const isOwner = session.ownerNumber && senderNumber === session.ownerNumber;
    const isConnectedNumber = session.connectedNumber && senderNumber === session.connectedNumber;
    const isAuthorized = isOwner || isConnectedNumber;

    if (session.botMode === 'private' && !isAuthorized) {
      return;
    }

    if (chat.isGroup && !bodyLower.startsWith('.')) {
      const groupSettings = await storage.getGroupSettings(session.id, chat.id._serialized);
      
      if (groupSettings && groupSettings.antiLinkMode !== 'off') {
        const hasLink = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|io|co|app|dev|info|xyz|me|tv|cc|biz|online|site|tech|store|shop|blog|ai|ml|gg|tk|ga|cf|gq|pl|us|uk|ca|au|in|br|jp|cn|de|ru|fr|it|es|nl|se|no|fi|dk|be|ch|at|pt|gr|cz|ro|hu|bg|hr|sk|si|lt|lv|ee|ie|nz|za|ae|sa|il|tr|mx|ar|cl|co|pe|ve|ec|bo|uy|py|cr|pa|gt|hn|ni|sv|do|pr|jm|bs|bb|gy|sr|gf|ht|cu|bz|aw|ai|vg|vi|ky|tc))(\/[^\s]*)?/i.test(body);
        
        if (hasLink && !isAuthorized) {
          try {
            await message.delete(true);
            await message.react('❌');
            
            if (groupSettings.antiLinkMode === 'warn') {
              let warning = await storage.getLinkWarning(groupSettings.id, senderNumber);
              const count = warning ? parseInt(warning.warningCount) + 1 : 1;
              
              await storage.upsertLinkWarning({
                groupSettingsId: groupSettings.id,
                userNumber: senderNumber,
                warningCount: count.toString(),
                lastWarning: new Date(),
              });

              if (count >= 3) {
                await chat.removeParticipants([contact.id._serialized]);
                await chat.sendMessage(`⛔ *User Removed*\n\n${senderNumber} has been removed for sending links after 3 warnings!`);
              } else {
                await chat.sendMessage(`⚠️ *Warning ${count}/3*\n\n@${contact.id.user}, links are not allowed in this group!\n\n_Next violations will result in removal._`, {
                  mentions: [contact]
                });
              }
            } else {
              await chat.sendMessage(`🚫 *Link Detected*\n\nLinks are not allowed in this group!`);
            }
            return;
          } catch (error) {
            console.error('Anti-link error:', error);
          }
        }
      }
    }

    const publicCommands = ['.tiktok', '.sc', '.repo', '.sticker', '.toimg'];
    const isPublicCommand = publicCommands.some(cmd => bodyLower.startsWith(cmd));
    
    if (chat.isGroup && bodyLower.startsWith('.') && !isAuthorized && !isPublicCommand) {
      return;
    }

    try {
      if (bodyLower === 'menu' || bodyLower === '.menu') {
        const isOwnerOrConnected = isOwner || isConnectedNumber;
        const menuText = `
╔══════════════════════════════╗
║   🤖 *BOT COMMAND MENU* 🤖   ║
╚══════════════════════════════╝

┌─────────────────────────────┐
│  👥 *GROUP MANAGEMENT*      │
└─────────────────────────────┘

  🚫 *.kick @user*
     Remove mentioned user from group
  
  💥 *.kick all*
     Remove all non-admin members
  
  ⛔ *.ban @user [reason]*
     Ban user from sending messages
  
  ✅ *.unban @user*
     Unban user and restore messaging
  
  ➕ *.create group [name]*
     Create a new group with you

┌─────────────────────────────┐
│  📱 *CONTACT EXTRACTION*    │
└─────────────────────────────┘

  📋 *.extract*
     Extract contacts to dashboard
  
  📄 *.ct*
     Extract with preview message

┌─────────────────────────────┐
│  🎨 *MEDIA CONVERSION* 🌐   │
└─────────────────────────────┘

  🖼️ *.sticker*
     Convert image to sticker (Anyone)
  
  📷 *.toimg*
     Convert sticker to image (Anyone)
  
  👁️ *.view*
     Reveal view-once media${session.botMode === 'public' && !isOwnerOrConnected ? ' (Owner Only)' : ''}

┌─────────────────────────────┐
│  📥 *DOWNLOADS* 🌐          │
└─────────────────────────────┘

  🎵 *.tiktok [link]*
     Download TikTok video (Anyone)

┌─────────────────────────────┐
│  🔒 *GROUP FEATURES*        │
└─────────────────────────────┘

  👻 *.taghide*
     Tag all members (hidden)
  
  🔗 *antilink on*
     Auto-delete all links
  
  ⚠️ *antilink warn*
     Warn users (3 strikes = kick)
  
  ✅ *antilink off*
     Disable anti-link protection
  
  👁️ *antiviewonce on*
     Prevent view-once media
  
  🔓 *antiviewonce off*
     Allow view-once media

┌─────────────────────────────┐
│  ℹ️ *INFORMATION* 🌐        │
└─────────────────────────────┘

  📋 *menu* or *.menu*
     Show this command menu
  
  📦 *.sc* or *.repo*
     View source code repository (Anyone)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 *Bot Mode:* ${session.botMode.toUpperCase()}
${session.botMode === 'private' ? '🔒 Commands work for owner & bot only' : '🌐 Most commands available to everyone'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ _Powered by WhatsApp Bot Manager_ ✨
        `.trim();
        
        await message.reply(menuText);
        await message.react('📋');
        return;
      }

      if (bodyLower.startsWith('.kick')) {
        if (!chat.isGroup) {
          await message.reply('❌ *Error*\n\nThis command only works in groups!');
          await message.react('❌');
          return;
        }

        await message.react('⚙️');

        if (bodyLower === '.kick all') {
          const participants = chat.participants;
          let kicked = 0;
          
          for (const participant of participants) {
            try {
              if (!participant.isAdmin) {
                await chat.removeParticipants([participant.id._serialized]);
                kicked++;
              }
            } catch (error) {
              console.error('Error kicking participant:', error);
            }
          }

          await message.reply(`✅ *Cleanup Complete*\n\nRemoved ${kicked} members from the group`);
          await message.react('✅');
          
          await storage.createBotLog({
            sessionId: session.id,
            message: `Kicked all members (${kicked}) from group: ${chat.name}`,
            type: "command",
          });
        } else {
          const mentionedContacts = await message.getMentions();
          if (mentionedContacts.length === 0) {
            await message.reply('❌ *Error*\n\nPlease mention the user you want to remove!\n\n*Usage:* .kick @user');
            await message.react('❌');
            return;
          }

          const targetContact = mentionedContacts[0];
          await chat.removeParticipants([targetContact.id._serialized]);
          await message.reply(`✅ *User Removed*\n\nRemoved @${targetContact.id.user} from the group`);
          await message.react('✅');

          await storage.createBotLog({
            sessionId: session.id,
            message: `Kicked user +${targetContact.id.user} from group: ${chat.name}`,
            type: "command",
          });
        }
        return;
      }

      if (bodyLower === '.extract') {
        if (!chat.isGroup) {
          await message.reply('❌ *Error*\n\nThis command only works in groups!');
          await message.react('❌');
          return;
        }

        await message.react('⚙️');
        const participants = chat.participants;
        const numbers = participants.map((p: any) => '+' + p.id.user);

        await storage.createExtractedContacts({
          sessionId: session.id,
          groupName: chat.name,
          contacts: numbers,
        });

        await message.reply(`✅ *Contacts Extracted*\n\n📊 Group: *${chat.name}*\n👥 Total: *${numbers.length} contacts*\n\n✨ Check your dashboard to download!`);
        await message.react('✅');

        await storage.createBotLog({
          sessionId: session.id,
          message: `Extracted ${numbers.length} contacts from group: ${chat.name}`,
          type: "command",
        });

        this.sendToUser(userId, { type: "log" });
        return;
      }

      if (bodyLower === '.ct') {
        if (!chat.isGroup) {
          await message.reply('❌ *Error*\n\nThis command only works in groups!');
          await message.react('❌');
          return;
        }

        await message.react('📝');
        const participants = chat.participants;
        const numbers = participants.map((p: any) => '+' + p.id.user);
        
        await storage.createExtractedContacts({
          sessionId: session.id,
          groupName: chat.name,
          contacts: numbers,
        });

        await message.reply(`📱 *Contact Extraction Complete*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 *Group:* ${chat.name}\n👥 *Total:* ${numbers.length} contacts\n📅 *Date:* ${new Date().toLocaleString()}\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n*Preview (First 10):*\n\n${numbers.slice(0, 10).join('\n')}${numbers.length > 10 ? `\n\n_+${numbers.length - 10} more contacts..._` : ''}\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Full list saved to dashboard!`);
        await message.react('✅');

        await storage.createBotLog({
          sessionId: session.id,
          message: `CT: Extracted ${numbers.length} contacts from ${chat.name}`,
          type: "command",
        });

        this.sendToUser(userId, { type: "log" });
        return;
      }

      if (bodyLower === '.view') {
        if (session.botMode === 'public' && !isAuthorized) {
          await message.reply('🔒 *Owner Only*\n\nThis command is only available to bot owners in public mode.');
          await message.react('🔒');
          return;
        }

        if (!message.hasQuotedMsg) {
          await message.reply('❌ *Error*\n\nPlease reply to a view-once message with this command!\n\n*Usage:* Reply to view-once media with *.view*');
          await message.react('❌');
          return;
        }

        await message.react('👁️');

        try {
          const quotedMsg = await message.getQuotedMessage();
          if (quotedMsg.hasMedia && (quotedMsg as any).isViewOnce) {
            const media = await quotedMsg.downloadMedia();
            if (media) {
              await chat.sendMessage(media, {
                caption: `👁️ *View-Once Revealed*\n\nHere's the view-once media you requested!`,
              });
              await message.react('✅');

              await storage.createBotLog({
                sessionId: session.id,
                message: `Revealed view-once media in ${chat.name || 'DM'}`,
                type: "command",
              });
            } else {
              await message.reply('❌ *Error*\n\nCould not download the view-once media.');
              await message.react('❌');
            }
          } else {
            await message.reply('❌ *Error*\n\nThe replied message is not a view-once media!');
            await message.react('❌');
          }
        } catch (error) {
          console.error('View-once reveal error:', error);
          await message.reply('❌ *Error*\n\nFailed to reveal view-once media. It may have expired.');
          await message.react('❌');
        }
        return;
      }

      if (bodyLower === '.sticker') {
        if (!message.hasQuotedMsg && !message.hasMedia) {
          await message.reply('❌ *Error*\n\nPlease reply to an image or send an image with the command!\n\n*Usage:* Reply to an image with *.sticker*');
          await message.react('❌');
          return;
        }

        await message.react('🎨');

        try {
          let media;
          if (message.hasQuotedMsg) {
            const quotedMsg = await message.getQuotedMessage();
            if (quotedMsg.hasMedia) {
              media = await quotedMsg.downloadMedia();
            }
          } else if (message.hasMedia) {
            media = await message.downloadMedia();
          }

          if (media && (media.mimetype.includes('image') || media.mimetype.includes('video'))) {
            await chat.sendMessage(media, { sendMediaAsSticker: true });
            await message.react('✅');

            await storage.createBotLog({
              sessionId: session.id,
              message: `Converted image to sticker in ${chat.name}`,
              type: "command",
            });
          } else {
            await message.reply('❌ *Error*\n\nPlease provide a valid image or video!');
            await message.react('❌');
          }
        } catch (error) {
          console.error('Sticker conversion error:', error);
          await message.reply('❌ *Error*\n\nFailed to convert to sticker. Please try again.');
          await message.react('❌');
        }
        return;
      }

      if (bodyLower === '.toimg') {
        if (!message.hasQuotedMsg && !message.hasMedia) {
          await message.reply('❌ *Error*\n\nPlease reply to a sticker with this command!\n\n*Usage:* Reply to a sticker with *.toimg*');
          await message.react('❌');
          return;
        }

        await message.react('🖼️');

        try {
          let media;
          if (message.hasQuotedMsg) {
            const quotedMsg = await message.getQuotedMessage();
            if (quotedMsg.hasMedia && quotedMsg.type === 'sticker') {
              media = await quotedMsg.downloadMedia();
            }
          } else if (message.hasMedia && message.type === 'sticker') {
            media = await message.downloadMedia();
          }

          if (media) {
            media.mimetype = 'image/png';
            await chat.sendMessage(media);
            await message.react('✅');

            await storage.createBotLog({
              sessionId: session.id,
              message: `Converted sticker to image in ${chat.name}`,
              type: "command",
            });
          } else {
            await message.reply('❌ *Error*\n\nPlease provide a valid sticker!');
            await message.react('❌');
          }
        } catch (error) {
          console.error('Image conversion error:', error);
          await message.reply('❌ *Error*\n\nFailed to convert sticker. Please try again.');
          await message.react('❌');
        }
        return;
      }

      if (bodyLower === '.taghide') {
        if (!chat.isGroup) {
          await message.reply('❌ *Error*\n\nThis command only works in groups!');
          await message.react('❌');
          return;
        }

        await message.react('👻');
        const participants = chat.participants;
        
        await chat.sendMessage('‎', { mentions: participants });
        await message.react('✅');
        
        await storage.createBotLog({
          sessionId: session.id,
          message: `Tagged ${participants.length} users hidden in ${chat.name}`,
          type: "command",
        });
        return;
      }

      if (bodyLower.startsWith('antilink ')) {
        if (!isAuthorized) {
          await message.reply('🔒 *Owner Only*\n\nOnly bot owners can use this command!');
          await message.react('🔒');
          return;
        }

        if (!chat.isGroup) {
          await message.reply('❌ *Error*\n\nThis command only works in groups!');
          await message.react('❌');
          return;
        }

        await message.react('⚙️');
        const mode = bodyLower.split(' ')[1];
        
        if (!['on', 'warn', 'off'].includes(mode)) {
          await message.reply('❌ *Usage Error*\n\n*Available modes:*\n• antilink on\n• antilink warn\n• antilink off');
          await message.react('❌');
          return;
        }

        await storage.upsertGroupSettings({
          sessionId: session.id,
          groupId: chat.id._serialized,
          groupName: chat.name,
          antiLinkMode: mode,
        });

        const messages = {
          on: '🛡️ *Anti-Link Enabled*\n\nAll links will be automatically deleted!',
          warn: '⚠️ *Anti-Link Warn Mode*\n\nUsers get 3 warnings before removal!',
          off: '✅ *Anti-Link Disabled*\n\nLinks are now allowed in this group!'
        };

        await message.reply(messages[mode as keyof typeof messages]);
        await message.react('✅');
        
        await storage.createBotLog({
          sessionId: session.id,
          message: `Anti-link set to ${mode} in ${chat.name}`,
          type: "command",
        });
        return;
      }

      if (bodyLower.startsWith('antiviewonce ')) {
        if (!isAuthorized) {
          await message.reply('🔒 *Owner Only*\n\nOnly bot owners can use this command!');
          await message.react('🔒');
          return;
        }

        if (!chat.isGroup) {
          await message.reply('❌ *Error*\n\nThis command only works in groups!');
          await message.react('❌');
          return;
        }

        await message.react('⚙️');
        const mode = bodyLower.split(' ')[1];
        
        if (!['on', 'off'].includes(mode)) {
          await message.reply('❌ *Usage Error*\n\n*Available modes:*\n• antiviewonce on\n• antiviewonce off');
          await message.react('❌');
          return;
        }

        await storage.upsertGroupSettings({
          sessionId: session.id,
          groupId: chat.id._serialized,
          groupName: chat.name,
          antiViewOnce: mode === 'on',
        });

        await message.reply(mode === 'on' ? '👁️ *Anti-View-Once Enabled*\n\nView-once media will be saved!' : '✅ *Anti-View-Once Disabled*\n\nView-once media allowed!');
        await message.react('✅');
        
        await storage.createBotLog({
          sessionId: session.id,
          message: `Anti-view-once ${mode} in ${chat.name}`,
          type: "command",
        });
        return;
      }

      if (bodyLower.startsWith('.ban ')) {
        if (!chat.isGroup) {
          await message.reply('❌ *Error*\n\nThis command only works in groups!');
          await message.react('❌');
          return;
        }

        await message.react('⚙️');

        const mentionedContacts = await message.getMentions();
        if (mentionedContacts.length === 0) {
          await message.reply('❌ *Error*\n\nPlease mention the user you want to ban!\n\n*Usage:* .ban @user [reason]');
          await message.react('❌');
          return;
        }

        const parts = body.split(' ');
        const reason = parts.slice(2).join(' ') || 'No reason provided';
        const targetContact = mentionedContacts[0];
        const targetNumber = '+' + targetContact.id.user;

        try {
          const groupSettings = await storage.upsertGroupSettings({
            sessionId: session.id,
            groupId: chat.id._serialized,
            groupName: chat.name,
          });

          const existingBan = await storage.getBannedUser(groupSettings.id, targetNumber);
          if (existingBan) {
            await message.reply(`⛔ *User Already Banned*\n\n@${targetContact.id.user} is already banned from sending messages.\n\n*Previous Reason:* ${existingBan.reason}`, {
              mentions: [targetContact]
            });
            await message.react('✅');
            return;
          }

          await storage.createBannedUser({
            groupSettingsId: groupSettings.id,
            userNumber: targetNumber,
            reason: reason,
          });

          await message.reply(`⛔ *User Banned*\n\n@${targetContact.id.user} has been banned from sending messages.\n\n*Reason:* ${reason}\n\n_They will be unable to send any messages in this group._`, {
            mentions: [targetContact]
          });
          await message.react('✅');

          await storage.createBotLog({
            sessionId: session.id,
            message: `Banned user ${targetNumber} from ${chat.name} - Reason: ${reason}`,
            type: "command",
          });
        } catch (error) {
          console.error('Ban command error:', error);
          throw error;
        }
        return;
      }

      if (bodyLower.startsWith('.unban ')) {
        if (!chat.isGroup) {
          await message.reply('❌ *Error*\n\nThis command only works in groups!');
          await message.react('❌');
          return;
        }

        await message.react('⚙️');

        const mentionedContacts = await message.getMentions();
        if (mentionedContacts.length === 0) {
          await message.reply('❌ *Error*\n\nPlease mention the user you want to unban!\n\n*Usage:* .unban @user');
          await message.react('❌');
          return;
        }

        const targetContact = mentionedContacts[0];
        const targetNumber = '+' + targetContact.id.user;

        const groupSettings = await storage.getGroupSettings(session.id, chat.id._serialized);
        if (!groupSettings) {
          await message.reply('❌ *Error*\n\nNo group settings found!');
          await message.react('❌');
          return;
        }

        const bannedUser = await storage.getBannedUser(groupSettings.id, targetNumber);
        if (!bannedUser) {
          await message.reply('❌ *Error*\n\nThis user is not banned!');
          await message.react('❌');
          return;
        }

        await storage.deleteBannedUser(groupSettings.id, targetNumber);

        await message.reply(`✅ *User Unbanned*\n\n@${targetContact.id.user} has been unbanned and can now send messages again.`, {
          mentions: [targetContact]
        });
        await message.react('✅');

        await storage.createBotLog({
          sessionId: session.id,
          message: `Unbanned user ${targetNumber} from ${chat.name}`,
          type: "command",
        });
        return;
      }

      if (bodyLower.startsWith('.tiktok ')) {
        const url = body.substring('.tiktok'.length).trim();
        if (!url || !url.includes('tiktok.com')) {
          await message.reply('❌ *Error*\n\nPlease provide a valid TikTok URL!\n\n*Usage:* .tiktok [TikTok URL]');
          await message.react('❌');
          return;
        }

        await message.react('⏳');
        await message.reply('📥 *Downloading TikTok Video*\n\nPlease wait while I download the video...');

        try {
          const response = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`);
          const data = await response.json();

          if (data.video && data.video.noWatermark) {
            const videoResponse = await fetch(data.video.noWatermark);
            const buffer = await videoResponse.arrayBuffer();
            const media = new MessageMedia('video/mp4', Buffer.from(buffer).toString('base64'), 'tiktok-video.mp4');
            
            await chat.sendMessage(media, {
              caption: `🎵 *TikTok Video Downloaded*\n\n${data.title || 'Video downloaded successfully!'}\n\n_Powered by WhatsApp Bot_`
            });
            await message.react('✅');

            await storage.createBotLog({
              sessionId: session.id,
              message: `Downloaded TikTok video in ${chat.name || 'DM'}`,
              type: "command",
            });
          } else {
            await message.reply('❌ *Error*\n\nCould not download the TikTok video. Please try another link.');
            await message.react('❌');
          }
        } catch (error) {
          console.error('TikTok download error:', error);
          await message.reply('❌ *Error*\n\nFailed to download TikTok video. The link may be invalid or the video may be private.');
          await message.react('❌');
        }
        return;
      }

      if (bodyLower === '.sc' || bodyLower === '.repo') {
        await message.react('📦');

        const settings = await storage.initializeAdminSettings();
        await message.reply(settings.repoMessage || '📦 Source code information not configured yet.');
        await message.react('✅');

        await storage.createBotLog({
          sessionId: session.id,
          message: `Shared repository info in ${chat.name || 'DM'}`,
          type: "command",
        });
        return;
      }

      if (bodyLower.startsWith('.create group')) {
        const groupName = body.substring('.create group'.length).trim();
        if (!groupName) {
          await message.reply('❌ *Error*\n\nPlease provide a group name!\n\n*Usage:* .create group MyGroupName');
          await message.react('❌');
          return;
        }

        await message.react('⚙️');
        const botInstance = this.bots.get(userId);
        if (botInstance) {
          await botInstance.client.createGroup(groupName, [contact.id._serialized]);
          await message.reply(`✅ *Group Created*\n\nSuccessfully created group: *${groupName}*`);
          await message.react('✅');

          await storage.createBotLog({
            sessionId: session.id,
            message: `Created new group: ${groupName}`,
            type: "command",
          });
        }
        return;
      }

      if (bodyLower === '.premium' || bodyLower === '.bulkinfo') {
        const isPremium = await storage.isPremiumActive(userId);
        const adminSettings = await storage.getAdminSettings();
        
        if (isPremium) {
          const premiumData = await storage.getPremiumUser(userId);
          const hoursLeft = Math.ceil((new Date(premiumData!.premiumUntil).getTime() - Date.now()) / (1000 * 60 * 60));
          
          await message.reply(`✨ *Premium Status* ✨\n\n🌟 *You are a Premium User!*\n\n📨 *Bulk Messaging:* Unlimited\n⏰ *Premium Expires:* ${hoursLeft} hours\n🔓 *Status:* Active\n\n━━━━━━━━━━━━━━━━━━━━━\n\nUse bulk messaging from your dashboard!`);
        } else {
          const adminNumber = adminSettings?.adminNumber || 'Not configured';
          await message.reply(`📨 *Bulk Messaging Info* 📨\n\n━━━━━━━━━━━━━━━━━━━━━\n\n🆓 *Free Tier:* 5 messages per session\n✨ *Premium:* Unlimited messages\n\n━━━━━━━━━━━━━━━━━━━━━\n\n💎 *Upgrade to Premium*\n\nContact admin to unlock unlimited bulk messaging:\n📱 *Admin:* ${adminNumber}\n\n━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ *Important:*\n• Use bulk messaging responsibly\n• Account bans are your responsibility\n• We are not liable for any issues\n\n━━━━━━━━━━━━━━━━━━━━━`);
        }
        await message.react('✅');
        return;
      }

    } catch (error) {
      console.error('Command error:', error);
      await message.reply('❌ *Error*\n\nSomething went wrong while executing the command. Please try again.');
      await message.react('❌');

      await storage.createBotLog({
        sessionId: session.id,
        message: `Error executing command: ${error}`,
        type: "error",
      });
    }
  }

  async startBot(userId: string): Promise<void> {
    const session = await storage.getBotSession(userId);
    if (!session?.connectedNumber) {
      throw new Error('Bot not connected. Generate QR code first.');
    }

    if (this.bots.has(userId)) {
      return;
    }

    await this.generateQR(userId);
  }

  async stopBot(userId: string): Promise<void> {
    const botInstance = this.bots.get(userId);
    if (botInstance) {
      try {
        if (botInstance.keepAliveInterval) {
          clearInterval(botInstance.keepAliveInterval);
        }
        await botInstance.client.destroy();
      } catch (error) {
        console.error('Error stopping bot:', error);
      }
      this.bots.delete(userId);
    }

    await storage.updateBotSession(userId, {
      status: "inactive",
      qrCode: null,
    });

    this.sendToUser(userId, {
      type: "status",
      status: "inactive",
    });
  }

  getBotStatus(userId: string): string {
    return this.bots.has(userId) ? 'active' : 'inactive';
  }

  async sendBulkMessage(recipients: string[], message: string, imageUrl?: string): Promise<void> {
    const activeBots = Array.from(this.bots.values());
    
    if (activeBots.length === 0) {
      throw new Error('No active bots available to send messages');
    }

    const botInstance = activeBots[0];
    let media = null;

    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        media = new MessageMedia(contentType, Buffer.from(buffer).toString('base64'));
      } catch (error) {
        console.error('Error downloading image for bulk message:', error);
      }
    }

    for (const recipient of recipients) {
      try {
        const chatId = recipient.replace('+', '') + '@c.us';
        
        if (media) {
          await botInstance.client.sendMessage(chatId, media, { caption: message });
        } else {
          await botInstance.client.sendMessage(chatId, message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error sending bulk message to ${recipient}:`, error);
      }
    }
  }

  async sendBulkMessageFromUser(userId: string, recipients: string[], message: string, imageUrl?: string): Promise<void> {
    const botInstance = this.bots.get(userId);
    
    if (!botInstance) {
      throw new Error('Bot not active for this user');
    }

    let media = null;

    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        media = new MessageMedia(contentType, Buffer.from(buffer).toString('base64'));
      } catch (error) {
        console.error('Error downloading image for bulk message:', error);
      }
    }

    for (const recipient of recipients) {
      try {
        const chatId = recipient.replace('+', '') + '@c.us';
        
        if (media) {
          await botInstance.client.sendMessage(chatId, media, { caption: message });
        } else {
          await botInstance.client.sendMessage(chatId, message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error sending bulk message to ${recipient}:`, error);
      }
    }
  }
}

export const botManager = new BotManager();
