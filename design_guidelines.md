# WhatsApp Bot Management Platform - Design Guidelines

## Design Approach

**Selected Approach**: Design System - Material Design principles adapted for dashboard/admin interfaces

**References**: Discord Bot Management, Telegram Bot Dashboard, Vercel Dashboard, Linear's admin interfaces

**Key Principles**: 
- Clear information hierarchy for complex data
- Efficient workflows for bot management
- Role-based interface differentiation
- Status visibility at a glance

---

## Typography System

**Font Families**:
- Primary: Inter (via Google Fonts) - for UI elements, buttons, labels
- Monospace: JetBrains Mono - for technical data (bot IDs, codes, logs)

**Type Scale**:
- Hero/Welcome: text-4xl to text-5xl, font-bold
- Page Titles: text-3xl, font-semibold
- Section Headers: text-xl, font-semibold
- Card Titles: text-lg, font-medium
- Body Text: text-base, font-normal
- Labels/Captions: text-sm, font-medium
- Helper Text: text-xs, font-normal

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4, p-6, p-8
- Section margins: space-y-6, space-y-8
- Card gaps: gap-4, gap-6
- Container padding: px-6 md:px-8 lg:px-12

**Grid Structure**:
- Dashboard stats: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- User management table: Full-width responsive table
- Bot control panel: 2-column layout (info + controls) on desktop
- Admin overview: 3-column metrics + 2-column detailed views

**Container Widths**:
- Authentication pages: max-w-md mx-auto
- Dashboard content: max-w-7xl mx-auto
- Admin panel: max-w-full (utilize screen space)
- Forms: max-w-lg

---

## Component Library

### Authentication Pages

**Login Screen**:
- Centered card layout with max-w-md
- Logo/brand at top (h-12 to h-16)
- Form fields with consistent spacing (space-y-4)
- Primary CTA button full-width
- "Don't have an account?" link below
- Split layout: Registration vs Login tabs

**Registration Screen**:
- Multi-step form or single card with max-w-lg
- Fields: Bot Name, Username, Email (each with labels above)
- Input groups with icons (envelope for email, user for username)
- Terms agreement checkbox
- Success state showing "Generate QR Code" button

### Dashboard Navigation

**Sidebar** (Admin & User):
- Fixed left sidebar w-64
- Logo/branding at top (h-16 with p-4)
- Navigation items with icons (from Heroicons)
  - Dashboard
  - My Bots (user) / All Users (admin)
  - Settings
  - Logout
- Active state: slightly inset with indicator
- User profile card at bottom showing username/email

**Top Bar**:
- Fixed header h-16 with px-6
- Page title on left
- Quick actions/notifications on right
- User avatar dropdown menu

### User Dashboard

**Welcome Section**:
- Greeting with username (text-2xl)
- Quick stats cards in grid:
  - Bot Status (Active/Inactive)
  - Connected Number
  - Messages Processed Today
  - Groups Managed
- Each stat card: p-6, rounded-lg, shadow-sm

**QR Code Section**:
- Prominent card max-w-md
- QR code display area (square, centered)
- "Generate New QR" button below
- Connection status indicator (dot + text)
- Countdown/expiry timer for QR

**Bot Control Panel**:
- Card with tabs: Overview, Commands, Logs
- Start/Stop toggle (large, prominent switch)
- Bot number display (monospace font)
- Owner number configuration field
- Command list with descriptions in table format

**Bot Features List**:
- Expandable accordion sections:
  - Group Management
  - Message Controls  
  - Advanced Features
- Each feature with toggle switch + description

### Admin Panel

**Login Gate**:
- Centered PIN entry (max-w-sm)
- Large input boxes for 4-digit code
- Auto-focus and auto-advance between digits
- Subtle shake animation on error

**Admin Dashboard**:
- Full-width layout utilizing screen space
- Top metrics row: grid-cols-4 gap-4
  - Total Users
  - Active Bots
  - Total Messages Today
  - System Status
- Main content: 2-column layout
  - Left: Recent activity feed (scrollable)
  - Right: Quick actions panel

**User Management Table**:
- Full-width responsive table
- Columns: Bot Name, Username, Email, Status, Actions
- Row actions: dropdown menu with:
  - View Details
  - Stop Bot (if active)
  - Resume Bot (if stopped)
  - View Logs
- Batch actions toolbar above table
- Search and filter controls
- Pagination at bottom

**User Detail Modal**:
- Slide-over panel from right (w-96 to w-1/3)
- User info at top
- Bot status timeline
- Activity logs (scrollable)
- Action buttons at bottom

### Forms & Inputs

**Text Inputs**:
- Label above (text-sm, font-medium, mb-2)
- Input field: px-4 py-3, rounded-lg, border
- Helper text below (text-xs)
- Error state with red indicator + message

**Toggle Switches**:
- Large, tactile switches for bot controls
- Label on left, switch on right
- Status text below switch

**Buttons**:
- Primary: px-6 py-3, rounded-lg, font-medium
- Secondary: outlined variant
- Danger: for destructive actions (kick all, stop bot)
- Icon buttons: p-2, rounded

### Cards & Containers

**Dashboard Cards**:
- p-6, rounded-xl, shadow-sm
- Header with icon + title
- Content area with appropriate spacing
- Footer with actions (if needed)

**Status Indicators**:
- Dot + text combinations
- Active: green dot
- Inactive: gray dot
- Error: red dot
- Processing: animated pulse

### Tables

**Data Tables**:
- Zebra striping for rows
- Sticky header on scroll
- Hover state on rows
- Sortable column headers with icons
- Responsive: stack on mobile

---

## Responsive Behavior

**Breakpoints**:
- Mobile (base): Single column, stacked layout
- Tablet (md:): 2-column grids, visible sidebar
- Desktop (lg:+): Full multi-column layouts, expanded tables

**Mobile Adaptations**:
- Sidebar converts to bottom navigation or hamburger menu
- Stats cards stack vertically
- Tables convert to card-based list view
- QR code section remains centered and prominent

---

## Images

**Logo/Branding**:
- WhatsApp-style bot icon in dashboard header
- Placement: Top-left of sidebar and login pages
- Size: h-12 on login, h-8 in sidebar

**Empty States**:
- Illustration for "No bots connected yet"
- Illustration for "No users registered" (admin)
- Icon-based graphics, not photos

**QR Code Display**:
- Generated QR code (technical, not an image asset)
- Displayed in clean white card with border
- Size: 256x256 to 300x300px

**No hero images needed** - This is a utility dashboard application focused on functionality over marketing appeal.

---

## Animation & Interactions

**Minimal Animations**:
- QR code fade-in on generation
- Success checkmarks on actions
- Loading spinners for async operations
- Smooth transitions on sidebar/modal entry (300ms)

**Critical: NO distracting animations** - Keep interactions snappy and purposeful for productivity tool.

---

## Accessibility

- All form inputs with proper labels and ARIA attributes
- Keyboard navigation for all interactive elements
- Focus indicators on all focusable elements (ring-2 ring-offset-2)
- Color-independent status indicators (use icons + text)
- Alt text for all images/icons
- Proper heading hierarchy (h1 → h6)