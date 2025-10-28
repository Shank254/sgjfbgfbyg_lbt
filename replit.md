# WhatsApp Bot Manager

## Overview

The WhatsApp Bot Manager is a multi-user platform for managing WhatsApp bot instances through a modern web dashboard. Users can register, create bot instances, connect them via QR code, and control various bot features including group management, media conversion, and security features like anti-link and anti-view-once protection. The platform includes both user dashboards and an admin panel for centralized management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server for fast HMR and optimized production builds
- **Wouter** for lightweight client-side routing (Register → Login → Dashboard → Admin flow)
- **TanStack Query (React Query)** for server state management, caching, and data synchronization

**UI Component System**
- **Radix UI primitives** for accessible, unstyled base components
- **Tailwind CSS** with custom design tokens for styling
- **shadcn/ui** component architecture (New York style variant)
- **Material Design principles** adapted for dashboard interfaces
- Custom CSS variables for theming with light/dark mode support

**State Management Strategy**
- Server state: React Query with custom `queryClient` configuration
- Local state: React hooks (useState, useEffect)
- Real-time updates: WebSocket connections managed in component lifecycle
- User session: localStorage for userId and username persistence

**Design System Decisions**
- Typography: Inter for UI, JetBrains Mono for technical data/logs
- Spacing: Tailwind utility classes with consistent 2-4-6-8-12-16-24 scale
- Layout: Responsive grid system with mobile-first breakpoints
- Color system: HSL-based with CSS custom properties for theme consistency

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript for REST API and HTTP server
- **Node.js 20+** runtime environment
- Custom middleware for request logging and JSON body parsing

**WebSocket Integration**
- **ws library** for real-time bidirectional communication
- Custom WebSocket path (`/ws`) with user subscription model
- Connection management in `botManager` for per-user message broadcasting
- Automatic reconnection handling on client side

**WhatsApp Bot Management**
- **whatsapp-web.js** library for WhatsApp Web API integration
- `BotManager` class managing multiple bot instances (Map-based storage)
- LocalAuth strategy for session persistence
- QR code generation using `qrcode` library
- Chromium/Puppeteer for headless browser automation

**Bot Features Architecture**
- **Group Management**: Commands for kicking users, creating groups, tagging members
- **Contact Extraction**: Export group contacts to CSV via dashboard
- **Security Features**: Anti-link (with configurable modes: on/warn/off), anti-view-once
- **Media Conversion**: Sticker creation, sticker-to-image conversion
- **Bot Modes**: Private (owner + bot only) vs Public (all group members)
- **Keep-Alive**: Configurable ping mechanism for free hosting platforms

**Command Processing**
- Prefix-based command detection (`.` prefix)
- Permission validation based on bot mode and ownership
- Group-specific settings stored per chat ID
- Warning system for anti-link with configurable thresholds

### Data Storage

**Database Solution**
- **PostgreSQL** as primary relational database
- **Neon Serverless** driver with WebSocket support for serverless environments
- **Drizzle ORM** for type-safe database queries and schema management
- Connection pooling via `@neondatabase/serverless` Pool

**Schema Design**
- **users**: Registration data (botName, username, email, hashed password)
- **botSessions**: Bot instance state (status, QR code, connected number, mode, keep-alive settings)
- **botLogs**: Activity logging with type categorization (info/success/error/command)
- **extractedContacts**: Stored group contact exports with timestamps
- **groupSettings**: Per-group configurations (anti-link mode, anti-view-once)
- **linkWarnings**: Tracking user warnings for anti-link enforcement
- **adminSettings**: Admin panel configuration (password, repository message)
- **bannedUsers**: Global user ban list

**Data Relationships**
- One-to-one: User → BotSession
- One-to-many: BotSession → BotLogs, ExtractedContacts
- Cascade deletion: Deleting user removes all associated data
- Foreign key constraints enforced at database level

**Storage Layer Pattern**
- `storage.ts` abstraction over database operations
- Interface-based design for potential future database swaps
- Password hashing with SHA-256 before storage
- Prepared statements via Drizzle for SQL injection protection

### Authentication & Authorization

**User Authentication**
- Session-based authentication using `express-session`
- PostgreSQL session store via `connect-pg-simple`
- Cookie-based session management with HTTP-only cookies
- Password hashing with crypto.createHash (SHA-256)

**Admin Authentication**
- Separate admin login endpoint with distinct credentials
- Admin password stored in database (adminSettings table)
- localStorage flag for admin session persistence
- Admin-only routes protected by authentication checks

**Permission Model**
- User-level: Each user manages only their own bot
- Bot ownership: Stored as ownerNumber in botSession
- Command permissions: Based on bot mode (private/public)
- Admin privileges: Full access to all users and bots

### External Dependencies

**WhatsApp Integration**
- **whatsapp-web.js**: Primary library for WhatsApp Web automation
- Requires Chromium browser (installed via buildpack on Heroku)
- Local authentication cache stored in `.wwebjs_cache/`
- Session persistence to avoid re-scanning QR codes

**Cloud Deployment Support**
- **Heroku**: Buildpack configuration for Chrome, PostgreSQL addon
- **Render**: Standard Node.js deployment with PostgreSQL service
- **Railway**: Nixpacks builder with migration script
- **Fly.io**: Dockerfile-based deployment capability
- Environment variable configuration for DATABASE_URL

**Development Tools**
- **tsx**: TypeScript execution for development server
- **esbuild**: Production build bundler for server code
- **drizzle-kit**: Database migration and schema management CLI
- **Replit plugins**: Runtime error overlay, cartographer, dev banner

**UI Component Libraries**
- Complete Radix UI suite (40+ primitive components)
- Form validation with react-hook-form + zod resolvers
- Date handling with date-fns
- Class name utilities: clsx, tailwind-merge, class-variance-authority

**Media & File Processing**
- QR code generation for bot pairing
- Media conversion within WhatsApp messages
- CSV export for contact data
- File system operations for cache management