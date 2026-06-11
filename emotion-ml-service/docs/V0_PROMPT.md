# V0.dev Prompt для веб-платформы ELAS

## Промпт для многостраничного сайта (светлый академический дизайн)

```
Create a comprehensive, multi-page website for an Emotion-Aware Learning Analytics System (ELAS) - a research platform for analyzing student emotional engagement during online lectures and exams. This is a diploma-level academic project, so the design should be professional, clean, and research-appropriate.

**CRITICAL: Multi-Page Structure Required**

The website must have the following pages/routes:
1. **Home Page** (`/`) - Landing page with overview
2. **Dashboard** (`/dashboard`) - Real-time analytics dashboard
3. **Sessions** (`/sessions`) - List of recorded sessions with filters
4. **Session Detail** (`/sessions/[id]`) - Detailed analysis of a specific session
5. **Reports** (`/reports`) - Generated reports and exports
6. **Settings** (`/settings`) - Configuration and preferences
7. **Documentation** (`/docs`) - Technical documentation and API reference
8. **About** (`/about`) - Research background and methodology

**Design Requirements:**

1. **Color Scheme - Light Academic Theme:**
   - Primary background: Clean white (#ffffff) or very light grey (#fafafa)
   - Secondary backgrounds: Soft grey (#f5f5f5, #f9fafb)
   - Text: Dark grey (#1f2937, #374151) for readability
   - Accent colors: Soft academic blues and teals (#3b82f6, #06b6d4, #0ea5e9)
   - Subtle purple accents (#6366f1) for highlights
   - Success: Green (#10b981)
   - Warning: Amber (#f59e0b)
   - Error: Red (#ef4444)
   - Borders: Light grey (#e5e7eb, #d1d5db)
   - NO dark backgrounds - this is a light, airy, academic design

2. **Typography:**
   - Headlines: Bold, serif or sans-serif (Inter, Poppins, or academic serif like Crimson Pro)
   - Body: Clean sans-serif (Inter, system-ui)
   - Code/Technical: Monospace (JetBrains Mono, Fira Code)
   - Generous line-height for readability
   - Clear hierarchy with size and weight

3. **Layout Principles:**
   - Generous white space
   - Clean, minimal aesthetic
   - Card-based components with subtle shadows (not glows)
   - Subtle borders and dividers
   - Professional spacing (consistent 8px/16px grid)
   - Responsive grid layouts

4. **Navigation:**
   - Fixed top navigation bar (white background, subtle shadow)
   - Logo on left: "ELAS" with academic icon
   - Main nav links: Home, Dashboard, Sessions, Reports, Docs, About
   - User menu/profile dropdown on right
   - Mobile: Hamburger menu
   - Breadcrumbs on detail pages

5. **Page Details:**

   **Home Page (`/`):**
   - Hero section: Large headline "Emotion-Aware Learning Analytics" with subtitle
   - Brief description of the research platform
   - Key statistics cards (3-4): "Active Sessions", "Students Analyzed", "Data Points", "Research Papers"
   - Feature highlights (6 cards in grid): Real-time Detection, Engagement Tracking, Stress Monitoring, Group Dynamics, Attention Drops, Confidence Assessment
   - Quick links to Dashboard and Documentation
   - Footer with links and copyright

   **Dashboard (`/dashboard`):**
   - Page title: "Real-Time Analytics Dashboard"
   - Control panel at top: Session selector, time range, refresh button
   - Live metrics cards (4): Average Engagement, Stress Level, Fatigue Index, Attention Score
   - Main chart area: Large line/area chart showing engagement over time (last 30-60 minutes)
   - Secondary charts: Emotion distribution (horizontal bar chart), Attention heatmap timeline
   - Live participant list: Table showing active faces with current state, engagement %, last update
   - Group dynamics summary: Cards showing collective patterns, heterogeneity, dominant emotions
   - Export button: Download current session data

   **Sessions (`/sessions`):**
   - Page title: "Recorded Sessions"
   - Filter bar: Date range picker, search by name/ID, filter by scenario (lecture/exam)
   - Sort options: Date, duration, engagement, participants
   - Session cards/list: Each card shows:
     * Session ID and date/time
     * Duration
     * Number of participants
     * Average engagement %
     * Key metrics (stress, fatigue)
     * Thumbnail/preview
     * Actions: View Details, Export, Delete
   - Pagination at bottom

   **Session Detail (`/sessions/[id]`):**
   - Breadcrumbs: Home > Sessions > [Session ID]
   - Session header: ID, date/time, duration, scenario type, participant count
   - Tabs: Overview, Timeline, Participants, Reports
   - Overview tab:
     * Summary metrics cards
     * Engagement timeline chart (full session)
     * Emotion distribution pie/bar chart
     * Attention drops timeline
     * Group dynamics summary
   - Timeline tab:
     * Interactive timeline with zoom
     * Emotion state changes per participant
     * Markers for attention drops, stress peaks
   - Participants tab:
     * Table/list of all participants (face_id or labels)
     * Individual metrics per participant
     * Click to see participant detail
   - Reports tab:
     * Generated JSON/text reports
     * Download buttons
     * Export options

   **Reports (`/reports`):**
   - Page title: "Generated Reports"
   - Filter: By session, date range, report type
   - Report cards: Each shows report name, session ID, generated date, type (JSON/Text), download button
   - Bulk export option

   **Settings (`/settings`):**
   - Page title: "Settings"
   - Tabs: General, Analytics, Export, Privacy
   - General: Theme (light/dark toggle), language, notifications
   - Analytics: Scenario profiles, thresholds, weights
   - Export: Default formats, file naming, auto-export options
   - Privacy: Data retention, anonymization settings

   **Documentation (`/docs`):**
   - Page title: "Documentation"
   - Sidebar navigation: Getting Started, API Reference, Analytics Methods, Configuration, FAQ
   - Main content area: Markdown-style documentation
   - Code examples with syntax highlighting
   - Search functionality

   **About (`/about`):**
   - Page title: "About ELAS"
   - Research background section
   - Methodology overview
   - Technology stack
   - Team/researchers section
   - Publications/links
   - Contact information

6. **Components & UI Elements:**
   - Cards: White background, subtle shadow (0 1px 3px rgba(0,0,0,0.1)), rounded corners (8-12px)
   - Buttons: Primary (blue), Secondary (outline), Ghost (text only)
   - Charts: Use Recharts or similar - clean, minimal styling
   - Tables: Alternating row colors, hover effects, sortable headers
   - Forms: Clean inputs with labels, validation states
   - Badges/Tags: Small colored pills for states (Engaged, Stressed, etc.)
   - Loading states: Subtle spinners, skeleton loaders
   - Empty states: Helpful messages with icons

7. **Visual Elements:**
   - Subtle icons (Lucide React icons)
   - Minimal illustrations (optional, academic style)
   - Clean data visualizations
   - NO dark glows, NO neon effects
   - Professional, research-appropriate aesthetic

8. **Responsive Design:**
   - Mobile-first approach
   - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
   - Mobile: Stacked layouts, collapsible sections
   - Desktop: Multi-column grids, sidebars

**Technical Stack:**
- Next.js 16+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts for visualizations
- React Hook Form for forms
- Date-fns for date handling

**Key Features to Implement:**
- Client-side routing between pages
- Mock data for dashboard and sessions (realistic academic data)
- Interactive charts with tooltips
- Responsive tables with sorting/filtering
- Form validation
- Loading and error states
- Accessible components (ARIA labels, keyboard navigation)

Make it look like a professional academic research platform - clean, trustworthy, and focused on clarity and usability. The design should inspire confidence in the research quality and data accuracy.
```

---

## Промпт для v0.dev (оригинальный, темная тема)

```
Create a sophisticated, modern single-page website for an Emotion-Aware Learning Analytics System (ELAS) - a research platform for analyzing student emotional engagement during online lectures and exams.

**Design Requirements:**

1. **Hero Section (Top of Page):**
   - Dark theme with deep black/dark grey backgrounds
   - Large, bold headline: "Emotion-Aware Learning Analytics" with subtitle "Real-time analysis of student engagement and emotional states"
   - **CRITICAL: Include a prominent, abstract 3D fluid/liquid graphic element on the right side of the hero**
     - This should be an organic, flowing, glossy 3D shape that resembles swirling liquid or molten glass
     - It should have a reflective, translucent appearance with dramatic highlights and soft shadows
     - The shape should be dynamic, twisting and folding, creating visual depth
     - Use subtle gradients (teal, blue, purple) with metallic/glass-like sheen
     - This element should be large and prominent, suggesting motion and fluidity
   - Brief description text below headline
   - Key statistics cards: "Active Sessions", "Students Analyzed", "Data Points Collected"
   - CTA button: "Get Started" or "View Demo"

2. **Overall Aesthetic:**
   - Dark mode: deep black (#0a0a0a) and dark grey (#1a1a1a) backgrounds
   - White/light grey text for readability
   - Accent colors: teal (#00d9ff), blue (#3b82f6), purple (#8b5cf6), green (#10b981)
   - Use subtle glows and gradients for depth
   - Generous negative space
   - Clean, modern sans-serif typography (Inter or similar)
   - Card-based layouts with subtle borders or glow effects

3. **Key Sections:**

   **Features Section:**
   - Title: "Powerful Analytics for Educational Insights"
   - 4-6 feature cards in a grid:
     * "Real-time Emotion Detection" - icon + description
     * "Engagement Tracking" - temporal analysis
     * "Stress & Fatigue Monitoring" - student wellbeing
     * "Group Dynamics Analysis" - classroom patterns
     * "Attention Drop Detection" - identify disengagement moments
     * "Confidence Assessment" - exam performance insights
   - Each card: dark grey background, icon, title, description, subtle hover effect

   **Analytics Dashboard Preview:**
   - Title: "Comprehensive Analytics Dashboard"
   - Show mockup/preview of dashboard with:
     * Line chart showing engagement over time (smooth gradient line)
     * Bar chart for emotional states distribution
     * Heatmap or timeline showing attention drops
     * Group metrics cards (average engagement, stress, fatigue)
   - Use abstract network graphics or data visualization elements
   - Dark background with glowing data points/nodes

   **How It Works:**
   - 3-step process:
     1. "Connect Camera" - WebRTC video stream
     2. "AI Analysis" - Real-time emotion recognition
     3. "View Insights" - Dashboard and reports
   - Use icons and illustrations, keep it visual

   **Use Cases:**
   - Two main scenarios:
     * "Online Lectures" - engagement tracking, attention drops
     * "Exams & Presentations" - stress monitoring, confidence assessment
   - Show example metrics for each

   **Technology Stack:**
   - Mention: Computer Vision, Deep Learning, Real-time Analytics
   - Show tech icons/logos (Python, TensorFlow, React, etc.)

   **Privacy & Ethics:**
   - Section emphasizing: "No video storage", "Anonymized analytics", "GDPR compliant", "Ethical AI"
   - Important for academic/research context

4. **Visual Elements:**
   - Abstract network graphics: glowing orbs/nodes connected by subtle lines (suggesting data flow)
   - Subtle circular patterns or gradients in backgrounds
   - Smooth animations on scroll (fade-in, slide-up)
   - Hover effects on cards and buttons
   - Gradient accents on important elements

5. **Footer:**
   - Links: About, Documentation, Contact
   - Copyright: "ELAS - Emotion-Aware Learning Analytics System"
   - Research/academic context

**Technical Notes:**
- Use React/Next.js structure
- Responsive design (mobile-friendly)
- Modern CSS with gradients, glows, and smooth transitions
- The fluid 3D element in hero can be created with CSS 3D transforms, SVG paths, or a library like Three.js (simplified version)
- Ensure the hero section is visually striking and the fluid element is the focal point

**Color Palette:**
- Background: #0a0a0a, #1a1a1a, #0f0f0f
- Text: #ffffff, #e5e7eb, #d1d5db
- Accents: #00d9ff (teal), #3b82f6 (blue), #8b5cf6 (purple), #10b981 (green)
- Cards: #1a1a1a with subtle border or glow

**Typography:**
- Headlines: Bold, large (48-72px)
- Body: Regular, readable (16-18px)
- Use Inter, Poppins, or similar modern sans-serif

Make it visually stunning, professional, and suitable for an academic/research platform while maintaining the dark, deep aesthetic with the prominent fluid graphic element.
```

---

## Альтернативный промпт (более краткий, фокус на дизайн)

```
Create a dark, sophisticated single-page website for an academic research platform: "Emotion-Aware Learning Analytics System" (ELAS) - analyzing student emotional engagement during online learning.

**Critical Design Element:**
Hero section must feature a large, abstract 3D fluid/liquid graphic on the right side:
- Organic, flowing, glossy shape resembling swirling liquid or molten glass
- Reflective, translucent appearance with dramatic highlights
- Dynamic, twisting form creating visual depth
- Subtle teal/blue/purple gradients with metallic sheen
- This is the focal point - make it prominent and beautiful

**Design Style:**
- Deep dark theme: #0a0a0a backgrounds, white text
- Accent colors: teal (#00d9ff), blue, purple gradients
- Modern, clean typography
- Card-based layouts with subtle glows
- Generous spacing for "deep" feel
- Smooth animations

**Sections:**
1. Hero: Headline + fluid graphic + stats + CTA
2. Features: 6 cards (emotion detection, engagement, stress, group dynamics, attention drops, confidence)
3. Analytics Preview: Mock dashboard with charts (engagement timeline, emotion distribution, attention heatmap)
4. How It Works: 3-step process
5. Use Cases: Lectures vs Exams
6. Privacy: GDPR, ethical AI, no video storage

**Visual Details:**
- Abstract network graphics (glowing nodes connected by lines)
- Subtle background patterns
- Gradient accents
- Smooth hover effects
- Professional, research-appropriate aesthetic

Make it visually striking and academic-quality, with the fluid graphic as the hero centerpiece.
```

---

## Использование

Скопируйте один из промптов выше и вставьте в v0.dev. Рекомендую первый (более детальный) — он даст более точный результат.

Если нужно что-то изменить (цвета, размеры, расположение элементов), укажите это в дополнительных инструкциях после генерации.
