# 🤖 WhatsApp Bot Manager

A powerful, feature-rich WhatsApp bot management platform with a beautiful dashboard. Manage multiple WhatsApp bot instances, extract contacts, enforce group rules, convert media, and much more!

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)

## ✨ Features

### 🎯 Core Features
- **Multi-User Support** - Multiple users can manage their own bots
- **Beautiful Dashboard** - Modern, responsive UI with real-time updates
- **Admin Panel** - Centralized management of all bot instances
- **Real-time WebSocket** - Instant bot status and log updates
- **PostgreSQL Database** - Reliable data persistence
- **Public/Private Modes** - Control who can use bot commands

### 🔐 Bot Modes
- **Private Mode** (default) - Only owner and bot number can use commands
- **Public Mode** - Anyone in groups can use bot commands

### 📱 Group Management Commands
- `.kick @user` - Remove mentioned user from group
- `.kick all` - Remove all non-admin members
- `.create group [name]` - Create new WhatsApp group
- `.taghide` - Tag all members (hidden mention)
- `.extract` - Extract group contacts to dashboard
- `.ct` - Extract contacts with message preview

### 🛡️ Security Features
- **Anti-Link** - Automatically detect and delete links
  - `antilink on` - Auto-delete all links
  - `antilink warn` - 3 warnings before kick
  - `antilink off` - Disable protection
  - Comprehensive link detection (100+ TLDs)
  
- **Anti-View-Once** - Save view-once media for transparency
  - `antiviewonce on` - Enable saving
  - `antiviewonce off` - Disable

### 🎨 Media Conversion
- `.sticker` - Convert image/video to sticker
- `.toimg` - Convert sticker to image

### 📊 Dashboard Features
- **QR Code Connection** - Easy bot setup with beautiful QR display
- **Bot Configuration** - Set owner number, mode, keep-alive
- **Activity Logs** - View all bot actions in real-time
- **Contact Management** - Download extracted contacts as CSV
- **Beautiful Alerts** - Toast notifications for all actions

### 👑 Admin Panel Features
- **User Management** - View and control all users
- **Bot Control** - Start/stop any user's bot
- **Global Statistics** - Total users, active bots, messages
- **All Contacts View** - See all extracted contacts
- **Bulk Export** - Download all contacts as CSV
- **4-Digit Access Code** - Secure admin access

### ⚡ Additional Features
- **Keep-Alive System** - Prevent bot from sleeping on free hosting
- **Beautiful WhatsApp Menu** - Formatted command list with emojis
- **Welcome Message** - Greeting when bot connects
- **Error Recovery** - Automatic reconnection on failures
- **Responsive Design** - Works on all devices

---

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/whatsapp-bot-manager.git
   cd whatsapp-bot-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up database**
   - Create a PostgreSQL database
   - Set environment variable:
     ```bash
     export DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_bot"
     ```

4. **Push database schema**
   ```bash
   npm run db:push
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

6. **Access the app**
   - Open http://localhost:5000
   - Register a new account
   - Generate QR code and scan with WhatsApp

---

## 🌐 Deployment

Deploy to your favorite platform! We support:

- **[Heroku](https://heroku.com)** - Easy deployment with Procfile
- **[Render](https://render.com)** - Free tier with auto-deploy
- **[Railway](https://railway.app)** - Simple GitHub integration
- **[Fly.io](https://fly.io)** - Global edge deployment
- **Docker** - Containerized deployment anywhere

### Quick Deploy Links

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions for each platform.

---

## 📖 Usage Guide

### First Time Setup

1. **Register Account**
   - Go to `/register`
   - Fill in bot name, username, email, password
   - Login after registration

2. **Connect WhatsApp**
   - Click "Generate QR Code"
   - Scan with WhatsApp (Settings → Linked Devices)
   - Wait for connection confirmation

3. **Configure Bot**
   - Set owner number (optional)
   - Choose bot mode (private/public)
   - Enable keep-alive for 24/7 operation

### Using Bot Commands

Send these commands in WhatsApp groups where the bot is a member:

#### Group Management
```
.kick @user          - Remove a user
.kick all            - Remove all non-admins
.create group MyGroup - Create new group
```

#### Contact Extraction
```
.extract             - Save contacts to dashboard
.ct                  - Extract with preview
```

#### Media Tools
```
.sticker             - Reply to image/video to make sticker
.toimg               - Reply to sticker to convert to image
```

#### Group Protection
```
antilink on          - Auto-delete all links
antilink warn        - Warn users (3 strikes)
antilink off         - Disable
antiviewonce on      - Save view-once media
antiviewonce off     - Allow view-once
```

#### Others
```
menu                 - Show all commands
.taghide             - Hidden tag all members
```

### Admin Access

1. Go to `/admin`
2. Enter access code: `4262` (change this!)
3. View all users, bots, and contacts
4. Control any user's bot
5. Download all contacts

---

## 🏗️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Drizzle ORM** - Type-safe database access
- **whatsapp-web.js** - WhatsApp Web API

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Data fetching
- **Wouter** - Routing
- **Shadcn/ui** - UI components
- **Tailwind CSS** - Styling

### Infrastructure
- **WebSockets** - Real-time updates
- **QRCode** - QR generation
- **Zod** - Schema validation

---

## 📂 Project Structure

```
whatsapp-bot-manager/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities
│   │   └── hooks/         # Custom hooks
│   └── public/            # Static assets
├── server/                # Backend Express app
│   ├── botManager.ts      # WhatsApp bot logic
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   ├── db.ts              # Database connection
│   └── index.ts           # Server entry point
├── shared/                # Shared code
│   └── schema.ts          # Database schema & types
├── Procfile               # Heroku config
├── render.yaml            # Render config
├── railway.json           # Railway config
├── fly.toml               # Fly.io config
├── Dockerfile             # Docker config
└── DEPLOYMENT.md          # Deployment guide
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `NODE_ENV` | Environment (production/development) | No | development |
| `PORT` | Server port | No | 5000 |

### Bot Settings

Configure in the dashboard:

- **Owner Number** - Phone number for command authorization
- **Bot Mode** - Private (owner only) or Public (anyone)
- **Keep-Alive** - Prevent sleeping on free hosting

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Push schema changes to database
```

### Database Schema

The app uses Drizzle ORM with PostgreSQL. Schema is defined in `shared/schema.ts`:

- `users` - User accounts
- `botSessions` - WhatsApp bot instances
- `botLogs` - Activity logs
- `extractedContacts` - Saved phone numbers
- `groupSettings` - Group-specific configurations
- `linkWarnings` - Anti-link violation tracking

---

## 🎨 Customization

### Changing Admin Code

Edit `server/routes.ts`:
```typescript
const ADMIN_CODE = "4262"; // Change this
```

### Theming

Customize colors in `client/src/index.css`:
- Light and dark mode support
- Customizable color variables
- Responsive design

---

## 🐛 Troubleshooting

### Bot Won't Connect
- Check internet connection
- Verify Chromium is installed
- Check logs for errors
- Try regenerating QR code

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Run `npm run db:push --force`

### Commands Not Working
- Verify you're authorized (owner or bot number)
- Check bot mode (private vs public)
- Ensure bot is in the group
- Check group admin permissions

### Bot Keeps Sleeping
- Enable keep-alive in dashboard
- Upgrade from free hosting tier
- Use monitoring service (UptimeRobot)

---

## 📱 Screenshots

### Dashboard
Beautiful, modern interface with real-time updates, QR code display, and comprehensive bot management.

### Admin Panel
Centralized control of all users, bots, and extracted contacts with powerful management tools.

### WhatsApp Menu
Clean, organized command menu with emojis and clear descriptions sent directly in WhatsApp.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Support

If you find this project helpful, please give it a ⭐️ on GitHub!

### Need Help?

- 📖 Read the [DEPLOYMENT.md](DEPLOYMENT.md) guide
- 🐛 Open an [issue](https://github.com/yourusername/whatsapp-bot-manager/issues)
- 💬 Start a [discussion](https://github.com/yourusername/whatsapp-bot-manager/discussions)

---

## 🔮 Roadmap

- [ ] Multi-language support
- [ ] Scheduled messages
- [ ] Auto-response templates
- [ ] Webhook integrations
- [ ] Analytics dashboard
- [ ] Export chat history
- [ ] Group insights
- [ ] Custom commands

---

## ⚠️ Disclaimer

This project is not affiliated with WhatsApp or Meta. Use responsibly and in accordance with WhatsApp's Terms of Service.

WhatsApp automation may violate their terms. This tool is provided for educational purposes. The developers are not responsible for any misuse or violations.

---

## 🙏 Acknowledgments

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API
- [Shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database toolkit

---

Made with ❤️ by developers, for developers

**Remember**: With great power comes great responsibility. Use this bot wisely!
