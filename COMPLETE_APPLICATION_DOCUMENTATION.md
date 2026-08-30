# Complete Application Documentation
## Heavy Cargo Lifters - Port Equipment Valuation & Trading Platform

**Version:** 1.0
**Last Updated:** February 10, 2026
**Target Audience:** Developers and Technical Stakeholders

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Modules](#core-modules)
5. [Database Schema](#database-schema)
6. [Edge Functions](#edge-functions)
7. [External Integrations](#external-integrations)
8. [Incomplete Features & Technical Debt](#incomplete-features--technical-debt)
9. [Known Issues](#known-issues)
10. [Development Setup](#development-setup)

---

## Overview

Heavy Cargo Lifters is a comprehensive platform for managing, valuing, and trading port equipment (forklifts, reachstackers, empty container handlers, and terminal tractors). The system handles the complete lifecycle from equipment intake, valuation, dealer bidding, publication to marketplaces, and sales tracking.

### Key Business Functions
- Equipment intake and technical specification documentation
- AI-powered photo organization and documentation
- Market data analysis and price suggestions
- Dealer network management and bidding system
- Multi-language PDF generation (NL, EN, DE)
- Publication to external marketplaces (Mascus, Forklift International)
- Maintenance document extraction and tracking
- Customer portal for direct equipment browsing

### Technology Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Storage:** Supabase Storage (photos, documents, videos)
- **PDF Generation:** jsPDF + pdf-lib
- **Maps:** Leaflet + OpenStreetMap
- **AI:** OpenAI GPT-4o (via Supabase Edge Functions)

---

## Architecture

### Frontend Architecture
```
src/
├── components/          # React components
├── pages/              # Page-level components
├── contexts/           # React contexts (Auth, Language)
├── lib/                # Supabase client, types
├── utils/              # Utility functions (PDF, Excel export, price suggestions)
└── main.tsx           # Application entry point
```

### Backend Architecture
- **Database:** PostgreSQL (Supabase managed)
- **Authentication:** Supabase Auth (email/password)
- **Storage Buckets:**
  - `dossier-photos` - Equipment photos
  - `dossier-attachments` - Equipment documents
  - `dossier-videos` - Equipment videos
  - `maintenance-documents` - Maintenance/service records
- **Edge Functions:** Deno-based serverless functions for AI processing, external API integrations, and data imports

### Security Model
- Row Level Security (RLS) on all tables
- Role-based access control (RBAC)
- Authenticated and service role policies
- Public read access for customer portal
- Secure storage bucket policies

---

## User Roles & Permissions

### 1. Admin (Full Access)
- Complete system access
- User management
- All CRUD operations
- System configuration

### 2. Manager (Management Access)
- Create/edit/delete dossiers
- User management (limited)
- Dealer management
- View all bids and financials
- Market data management
- Publication management

### 3. Verkoper (Sales User)
- Create/edit dossiers
- View assigned dossiers
- Create bids
- Cannot delete dossiers
- Limited financial visibility

### 4. Eindgebruiker (End User / Valuation Tool Access)
- Access to valuation tool only
- Create dossiers for valuation
- View market data
- Cannot publish or sell equipment
- Read-only on others' dossiers

### 5. Dealer (External Partner)
- View published equipment
- Submit bids
- View own bid history
- Limited to assigned equipment

### 6. Customer (Public Access)
- Browse published equipment via customer portal
- View photos and specifications
- Contact for inquiries
- No login required

---

## Core Modules

### 1. Dossier Management System

**Purpose:** Central equipment documentation and lifecycle tracking

**Key Features:**
- ✅ **Equipment Types Supported:**
  - Heavy Duty Forklifts
  - Empty Container Handlers (ECH)
  - Reachstackers
  - Terminal Tractors

- ✅ **Dossier Creation:**
  - Auto-generated dossier numbers (HCL26-XXX format)
  - Equipment type selection
  - Basic information (brand, model, year, location)
  - Condition assessment
  - GPS coordinates (with map visualization)
  - Customer name tracking

- ✅ **Technical Details Forms:**
  - Equipment-specific detail forms
  - Auto-sync with main dossier table
  - Comprehensive specifications:
    - Engine details (brand, type, power)
    - Transmission details
    - Axle specifications
    - Mast specifications (for forklifts)
    - Cabin features (heater, AC, lights)
    - Tire specifications
    - Hydraulic systems
    - Attachments and accessories
    - Dimensions and weights
    - Running hours

- ✅ **Photo Management:**
  - Upload multiple photos
  - AI-powered photo categorization (14 categories)
  - Manual category override
  - Drag-and-drop reordering
  - Visibility toggle (visible online/internal only)
  - Photo deletion
  - Categories: Front, Rear, Side, Mast, Cabin, Engine, Attachments, Damage, Tires, Dashboard, Overview, etc.

- ✅ **Document Management:**
  - Upload equipment documents (manuals, certificates)
  - Support for PDF, images, Office documents
  - Document type categorization
  - Download and delete capabilities

- ✅ **Video Management:**
  - Upload equipment videos
  - Video storage and playback
  - Visibility control

- ✅ **Maintenance Documents:**
  - Upload service/maintenance records
  - AI-powered data extraction from PDFs
  - Automatic field population
  - Manual review and approval system
  - Track maintenance history

- ✅ **Status Workflow:**
  - Draft → Open → Stock → Bidding → Sold → Archived
  - Status-based access control
  - Visual status indicators

- ✅ **Financial Tracking:**
  - Purchase price
  - Estimated value (valuation)
  - Sale price
  - Price history tracking

- ✅ **Dossier Actions:**
  - Copy dossier (duplicate with new number)
  - Export to PDF (internal & external versions)
  - Export to Excel
  - Delete (with cascade to photos, bids, details)

**File Location:**
- `src/pages/DossierDetailPage.tsx` (main page)
- `src/components/ForkliftDetailsForm.tsx`
- `src/components/EmptyContainerHandlerDetailsForm.tsx`
- `src/components/ReachstackerDetailsForm.tsx`
- `src/components/TerminalTractorDetailsForm.tsx`
- `src/components/PhotoGallery.tsx`
- `src/components/PhotoUpload.tsx`
- `src/components/DocumentUpload.tsx`
- `src/components/VideoUpload.tsx`
- `src/components/MaintenanceUpload.tsx`

**Database Tables:**
- `dossiers` (main table)
- `forklift_details`
- `empty_container_handler_details`
- `reachstacker_details`
- `terminal_tractor_details`
- `photos`
- `dossier_attachments`
- `videos`
- `maintenance_documents`

---

### 2. Bidding System

**Purpose:** Manage dealer bids and negotiations

**Key Features:**
- ✅ **Bid Creation:**
  - Manual bid entry by managers/sellers
  - Amount and currency
  - Status tracking (Pending, Submitted, Accepted, Rejected)
  - Notes field
  - Dealer assignment

- ✅ **Bid Invitation System:**
  - Send email invitations to dealers
  - Custom message
  - Direct link to equipment
  - Invitation tracking

- ✅ **Bulk Offers:**
  - Send offers to multiple dealers simultaneously
  - Equipment details included
  - Automated email distribution

- ✅ **Dealer Bid Submission:**
  - Dealers can submit bids via dealer portal
  - Bid amount entry
  - Optional notes
  - Status tracking

- ✅ **Bid Management:**
  - View all bids per dossier
  - Accept/reject bids
  - Track bid history
  - Financial overview

- ⚠️ **Known Limitations:**
  - No automated bid expiration
  - No bid comparison tools
  - Limited notification system

**File Location:**
- `src/components/BidsSection.tsx`
- `src/components/NewBidModal.tsx`
- `src/components/BulkOfferModal.tsx`
- `src/pages/BiedingenPage.tsx` (all bids overview)
- `supabase/functions/send-bid-invitation/`
- `supabase/functions/bulk-offer-to-dealers/`

**Database Tables:**
- `bids`

---

### 3. Dealer Management

**Purpose:** Manage dealer network and access

**Key Features:**
- ✅ **Dealer Database:**
  - Company name
  - Contact person
  - Email (optional)
  - Phone
  - Country
  - City
  - Notes

- ✅ **Dealer Account Creation:**
  - Create Supabase auth account for dealer
  - Auto-generate secure password
  - Send credentials via email
  - Link dealer profile to auth account

- ✅ **Dealer Portal:**
  - Separate dealer dashboard
  - View published equipment
  - Submit bids
  - View bid history
  - Limited access (only published equipment)

- ⚠️ **Incomplete Features:**
  - No dealer self-registration
  - No dealer profile management by dealer
  - No dealer performance analytics
  - No dealer communication history

**File Location:**
- `src/pages/DealersPage.tsx`
- `src/components/NewDealerModal.tsx`
- `src/components/CreateDealerLoginModal.tsx`
- `src/pages/DealerDashboardPage.tsx`
- `src/pages/DealerDossierViewPage.tsx`
- `supabase/functions/create-dealer-account/`

**Database Tables:**
- `dealers`
- Link to `auth.users` via `auth_user_id`

---

### 4. Market Data & Valuation System

**Purpose:** Market intelligence and price suggestion engine

**Key Features:**
- ✅ **Market Data Database:**
  - Historical sales data
  - Equipment specifications
  - Sale prices and dates
  - Market sources (websites, auctions)
  - Search functionality

- ✅ **Manual Data Entry:**
  - Form-based entry for each equipment type
  - Comprehensive specification fields
  - Sale price and date tracking
  - Source documentation

- ✅ **CSV Import System:**
  - Bulk import from Excel/CSV
  - Template provided
  - Field mapping
  - Validation and error handling
  - Equipment type auto-detection

- ✅ **Price Suggestion Algorithm:**
  - Match based on:
    - Equipment type
    - Brand
    - Model
    - Year (+/- 3 years)
    - Capacity
    - Hours (weighted)
    - Condition
  - Display similar equipment
  - Confidence scoring
  - Price range suggestions

- ✅ **Web Scraping Integration:**
  - Mascus scraper (automated)
  - Store scraped data
  - Image URL storage
  - Screenshot capability
  - Duplicate detection

- ⚠️ **Known Limitations:**
  - Price algorithm needs refinement (basic matching)
  - No machine learning model
  - Limited scraping sources
  - No automated price updates
  - Manual scraping activation required

**File Location:**
- `src/pages/MarktdataDatabasePage.tsx`
- `src/pages/MarktdataInvoerenPage.tsx`
- `src/pages/MarktdataImportPage.tsx`
- `src/pages/TaxatiePage.tsx` (valuation tool)
- `src/components/PriceSuggestion.tsx`
- `src/components/MarktdataForkliftForm.tsx`
- `src/components/MarktdataECHForm.tsx`
- `src/components/MarktdataReachstackerForm.tsx`
- `src/components/MarktdataTerminalTractorForm.tsx`
- `src/utils/priceSuggestion.ts`
- `supabase/functions/import-marktdata/`
- `supabase/functions/scrape-mascus/`

**Database Tables:**
- `marktdata`
- `price_history`
- `marktdata_access_log` (track eindgebruiker access)

---

### 5. Publication System

**Purpose:** Publish equipment to external marketplaces

**Key Features:**
- ✅ **Publication Platforms:**
  - Mascus (equipment marketplace)
  - Forklift International (forklift-specific)

- ✅ **Mascus Integration:**
  - HTTP request queue system
  - Publish equipment with photos
  - Update equipment
  - Unpublish (delete)
  - Track publication status
  - API credentials management
  - Request logging and error tracking

- ✅ **Forklift International Integration:**
  - Equipment publication
  - Photo upload (up to 30)
  - Specification mapping
  - Daily sync (update prices, status)
  - Unpublish capability
  - Publication tracking

- ✅ **Publication Dashboard:**
  - Overview of all published equipment
  - Platform-specific views
  - Publication status tracking
  - Quick publish/unpublish actions
  - Sync status monitoring

- ✅ **Advertisement Sync:**
  - Track external advertisement IDs
  - Sync status updates
  - Error tracking
  - Manual retry capability

- ⚠️ **Known Issues:**
  - HTTP request queue can have null URL errors (needs debugging)
  - Mascus API sometimes fails silently
  - Forklift International field mapping incomplete for some equipment types
  - No automated retry for failed publications
  - Limited error reporting to users

**File Location:**
- `src/pages/PublicationDashboardPage.tsx`
- `src/components/PublicationSection.tsx`
- `supabase/functions/publish-to-mascus/`
- `supabase/functions/publish-to-forklift-international/`
- `supabase/functions/sync-advertisements/`
- `supabase/functions/daily-forklift-international-sync/`

**Database Tables:**
- `advertisements`
- `http_request_queue`
- `api_credentials`

**Documentation:**
- `FORKLIFT_INTERNATIONAL_SETUP.md`
- `FORKLIFT_INTERNATIONAL_FIELD_MAPPING.md`
- `FORKLIFT_INTERNATIONAL_DEBUG.md`

---

### 6. PDF Generation System

**Purpose:** Generate professional equipment documentation

**Key Features:**
- ✅ **PDF Types:**
  - **Internal Report:** Full details including serials, bids, internal notes
  - **External Report:** Customer-facing, excludes sensitive info, includes T&C
  - **Clean External:** Minimal version without footer/terms

- ✅ **Multi-Language Support:**
  - Dutch (NL)
  - English (EN)
  - German (DE)
  - Translated labels and terminology

- ✅ **Content Sections:**
  - Company logo (HCL)
  - Equipment title (brand + model)
  - Hero photo (front view)
  - General information table
  - Technical specifications (equipment-specific)
  - Description/remarks
  - Bid overview (internal only)
  - Photo gallery (all visible photos)
  - Company footer with contact info
  - Terms & conditions (external only, language-specific)

- ✅ **Features:**
  - Image compression (performance)
  - Multi-page layout
  - Auto page breaks
  - Professional styling
  - Conditional field display
  - Equipment-specific specifications

- ✅ **Security:**
  - Serial numbers HIDDEN in external PDFs (as of latest update)
  - Stock ID shown
  - Sensitive internal info excluded from external versions

**File Location:**
- `src/utils/pdfExport.ts`

**Assets:**
- `/public/hclifters.jpg` (logo)
- `/public/verkoopvoorwaarden_nl.pdf`
- `/public/verkoopvoorwaarden_de.pdf`
- `/public/terms_and_conditions_of_sales_uk.pdf`

---

### 7. Excel Export System

**Purpose:** Export equipment data for analysis

**Key Features:**
- ✅ **Export Capabilities:**
  - Export all dossiers to Excel
  - Export market data to Excel
  - Customizable column selection
  - Formatted tables with headers

- ✅ **Data Included:**
  - All dossier fields
  - Technical specifications
  - Status and dates
  - Financial data
  - Location information

**File Location:**
- `src/utils/excelExport.ts`

---

### 8. AI-Powered Features

**Purpose:** Automate repetitive tasks with AI

**Key Features:**
- ✅ **AI Photo Categorization:**
  - Analyze equipment photos
  - Assign to 14 predefined categories
  - Confidence scoring
  - Batch processing
  - Manual override capability
  - OpenAI GPT-4o Vision integration

- ✅ **Maintenance Document Extraction:**
  - Extract text from PDF maintenance documents
  - Identify key information:
    - Service dates
    - Running hours
    - Service type
    - Parts replaced
    - Technician notes
  - Auto-populate dossier fields
  - Manual review workflow
  - Approval/rejection system

- ⚠️ **Known Limitations:**
  - Photo categorization accuracy ~85% (needs training)
  - Maintenance extraction depends on document format
  - No batch processing UI for maintenance docs
  - Extraction limited to PDF format
  - No OCR for scanned documents

**File Location:**
- `supabase/functions/sort-photos-with-ai/`
- `supabase/functions/extract-maintenance-document/`
- `supabase/functions/extract-pdf-data/` (general PDF extraction)

**Documentation:**
- `AI_FOTO_SORTERING_INSTRUCTIES.md`

---

### 9. Customer Portal

**Purpose:** Public-facing equipment catalog

**Key Features:**
- ✅ **Public Access:**
  - No login required
  - View published equipment
  - Browse by equipment type
  - Search functionality
  - Filter capabilities

- ✅ **Equipment Display:**
  - Photo gallery
  - Technical specifications
  - Location map
  - Contact information
  - Download PDF

- ⚠️ **Incomplete Features:**
  - No shopping cart
  - No direct inquiry form
  - No equipment comparison
  - Limited filtering options
  - No saved searches

**File Location:**
- `src/pages/CustomerPortalPage.tsx`

**Database Access:**
- Uses public read policies on `dossiers` table
- Filtered to show only `status = 'stock'` equipment

---

### 10. Dashboard & Analytics

**Purpose:** Business intelligence and overview

**Key Features:**
- ✅ **Main Dashboard:**
  - Equipment count by status
  - Recent dossiers
  - Pending bids
  - Quick actions
  - Search functionality

- ✅ **Data Overview Widget:**
  - Total equipment count
  - Status breakdown
  - Value statistics
  - Visual charts

- ✅ **Fleet Dashboard:**
  - Equipment by type
  - Location distribution
  - Age distribution
  - Value overview

- ✅ **Map Overview:**
  - Geographic distribution
  - Interactive markers
  - Equipment clustering
  - Location-based filtering

- ⚠️ **Missing Analytics:**
  - No sales trends
  - No dealer performance metrics
  - No time-on-market tracking
  - No profit/margin analysis
  - No forecasting

**File Location:**
- `src/pages/DashboardPage.tsx`
- `src/components/DataOverviewWidget.tsx`
- `src/components/FleetDashboard.tsx`
- `src/components/MapOverview.tsx`

---

### 11. Search & Navigation

**Purpose:** Quick access to equipment and data

**Key Features:**
- ✅ **Global Search:**
  - Search across all dossiers
  - Search by:
    - Dossier number
    - Brand
    - Model
    - Location
    - Customer name
  - Real-time results
  - Quick navigation

- ✅ **Navigation Structure:**
  - Main dashboard
  - Dossiers list
  - Dealer management
  - Bidding overview
  - Market data
  - Publications
  - Settings

- ✅ **Filtering:**
  - Status filters
  - Equipment type filters
  - Date range filters
  - Text search

**File Location:**
- `src/components/GlobalSearch.tsx`
- `src/components/DossierNavbar.tsx`

---

### 12. User Management

**Purpose:** Manage internal users and access

**Key Features:**
- ✅ **User Creation:**
  - Email/password authentication
  - Role assignment
  - Profile information
  - Language preference

- ✅ **User Roles:**
  - Admin
  - Manager
  - Verkoper
  - Eindgebruiker

- ✅ **User Actions:**
  - Create users
  - Update user info
  - Delete users
  - Reset passwords
  - Change roles

- ✅ **Test User System:**
  - Create test users for development
  - Reset test passwords
  - Sandbox environment support

**File Location:**
- `src/pages/SettingsPage.tsx`
- `supabase/functions/create-test-users/`
- `supabase/functions/update-user/`
- `supabase/functions/delete-user/`
- `supabase/functions/reset-test-passwords/`

**Database Tables:**
- `user_profiles` (synced with auth.users)

**Documentation:**
- `USER_DELETION_GUIDE.md`
- `GEBRUIKERSROLLEN_OVERZICHT.md`

---

### 13. Multi-Language System

**Purpose:** Support international users

**Key Features:**
- ✅ **Supported Languages:**
  - Dutch (NL) - primary
  - English (EN)
  - German (DE)

- ✅ **Translation Coverage:**
  - UI labels
  - Form fields
  - PDF documents
  - Email templates
  - Status labels
  - Equipment types

- ✅ **User Preference:**
  - Per-user language setting
  - Persistent across sessions
  - Easy switching

- ⚠️ **Incomplete:**
  - Not all screens translated
  - Some hardcoded Dutch text
  - Missing translations in edge functions
  - No translation management system

**File Location:**
- `src/contexts/LanguageContext.tsx`
- `src/lib/translations.ts`

---

### 14. Storage & Media Management

**Purpose:** Manage files and media

**Key Features:**
- ✅ **Storage Buckets:**
  - Dossier photos (up to 10MB each)
  - Equipment documents (up to 50MB)
  - Equipment videos (up to 100MB)
  - Maintenance documents (up to 20MB)

- ✅ **File Operations:**
  - Upload with progress
  - Download
  - Delete
  - Public URL generation
  - Access control

- ✅ **Security:**
  - RLS on storage buckets
  - Role-based access
  - Public read for customer portal
  - Authenticated write

**Configuration:**
- Supabase Storage Policies
- See migrations for bucket setup

---

## Database Schema

### Core Tables

#### `dossiers`
Main equipment records table.

**Key Fields:**
- `id` (uuid, PK)
- `dossier_number` (text, unique) - Auto-generated HCL26-XXX
- `title` (text)
- `description` (text)
- `equipment_type` (text) - heavy_duty_forklift, container_handler, reachstacker, terminal_tractor
- `brand` (text)
- `model` (text)
- `year` (integer)
- `condition` (text) - excellent, good, fair, poor
- `location` (text)
- `gps_latitude` (numeric)
- `gps_longitude` (numeric)
- `customer_name` (text)
- `estimated_value` (numeric)
- `purchase_price` (numeric)
- `sale_price` (numeric)
- `status` (text) - draft, open, stock, bidding, sold, archived
- `created_by` (uuid, FK → user_profiles)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes:**
- dossier_number
- status
- equipment_type
- created_by

**RLS Policies:**
- Authenticated users can read all
- Managers/admins can insert
- Owners and managers can update
- Managers can delete
- Public can read published (status='stock')

---

#### `forklift_details`
Extended forklift specifications.

**Key Fields:**
- `id` (uuid, PK)
- `dossier_id` (uuid, FK → dossiers)
- `order_no` (text) - Stock ID
- `serial_no` (text) - Serial number
- `brand` (text)
- `type` (text) - Model
- `power` (text) - Diesel, Electric, LPG, Hybrid
- `capacity_kg` (integer)
- `load_center_mm` (integer)
- `year_of_manufacture` (integer)
- `hours_on_clock` (integer)
- `mast` (text)
- `mast_type` (text)
- `free_lift` (text)
- `lift_height_mm` (integer)
- `cabin_type` (text)
- `heater` (boolean)
- `airco` (boolean)
- `engine_brand` (text)
- `engine_type` (text)
- `trans_brand` (text)
- `trans_type` (text)
- `shift_type` (text)
- `adblue` (boolean)
- `particle_filter` (text)
- `forks_length_mm` (integer)
- `forks_width_mm` (integer)
- `forks_thickness_mm` (integer)
- `no_forks` (boolean)
- `hydraulic_lines` (integer)
- `tires_front` (text)
- `tires_rear` (text)
- `seat_brand` (text)
- `attachment` (text)
- `remark` (text)
- Plus 30+ more technical fields

**Triggers:**
- Auto-create on dossier insert
- Sync brand/model/year with dossier

---

#### `empty_container_handler_details`
Extended ECH specifications.

**Key Fields:**
- Similar structure to forklift_details
- ECH-specific fields:
  - `double_box_type` (text)
  - `spreader_type` (text)
  - Container-specific measurements

---

#### `reachstacker_details`
Extended reachstacker specifications.

**Key Fields:**
- Similar structure to forklift_details
- Reachstacker-specific fields:
  - `stacking_height_1_over_5` (integer)
  - `stacking_height_loaded` (integer)
  - `capacity_row_2_3_kg` (integer)
  - `capacity_row_4_5_kg` (integer)

---

#### `terminal_tractor_details`
Extended terminal tractor specifications.

**Key Fields:**
- Similar structure to forklift_details
- Terminal tractor-specific fields:
  - `fifth_wheel_height_mm` (integer)
  - `coupling_type` (text)

---

#### `bids`
Dealer bids on equipment.

**Key Fields:**
- `id` (uuid, PK)
- `dossier_id` (uuid, FK → dossiers)
- `dealer_id` (uuid, FK → dealers)
- `bedrag` (numeric) - Legacy amount field
- `amount` (numeric) - Amount
- `valuta` (text) - Currency (EUR, USD)
- `status` (text) - pending, submitted, accepted, rejected
- `notitie` (text) - Notes (legacy)
- `notes` (text) - Notes
- `sales_price` (numeric) - Final sale price if accepted
- `created_by` (uuid, FK → user_profiles)
- `created_at` (timestamptz)

**RLS Policies:**
- Authenticated can read
- Managers/verkoper can insert
- Managers can update/delete
- Dealers can insert on their assigned dossiers

---

#### `dealers`
Dealer network database.

**Key Fields:**
- `id` (uuid, PK)
- `name` (text) - Company name
- `contact_person` (text)
- `email` (text)
- `phone` (text)
- `country` (text)
- `city` (text)
- `notes` (text)
- `auth_user_id` (uuid) - Link to auth.users
- `created_at` (timestamptz)

**RLS Policies:**
- Authenticated can read all
- Managers can insert/update/delete

---

#### `photos`
Equipment photos.

**Key Fields:**
- `id` (uuid, PK)
- `dossier_id` (uuid, FK → dossiers)
- `storage_path` (text) - Supabase storage path
- `filename` (text)
- `category` (text) - voorkant, achterkant, zijkant, etc.
- `visible_online` (boolean) - Show in customer portal
- `display_order` (integer) - Manual ordering
- `uploaded_by` (uuid, FK → user_profiles)
- `created_at` (timestamptz)

**RLS Policies:**
- Authenticated can read all
- Authenticated can insert
- Owner/manager can update/delete
- Public can read if visible_online = true

---

#### `marktdata`
Market intelligence database.

**Key Fields:**
- `id` (uuid, PK)
- `equipment_type` (text)
- `brand` (text)
- `model` (text)
- `year` (integer)
- `capacity_kg` (integer)
- `load_center_mm` (integer)
- `hours` (integer)
- `condition` (text)
- `sale_price` (numeric)
- `sale_date` (date)
- `sale_location` (text)
- `source` (text) - Website, auction, internal
- `source_url` (text)
- `screenshot_url` (text) - From web scraper
- `image_urls` (text[]) - Photo URLs from scraper
- `scraped_data` (jsonb) - Raw scraper output
- `created_by` (uuid, FK → user_profiles)
- Plus 50+ equipment-specific fields

**RLS Policies:**
- Authenticated can read
- Authenticated can insert
- Managers can update/delete
- Eindgebruiker access logged

---

#### `advertisements`
External publication tracking.

**Key Fields:**
- `id` (uuid, PK)
- `dossier_id` (uuid, FK → dossiers)
- `platform` (text) - mascus, forklift_international
- `external_id` (text) - Platform's advertisement ID
- `status` (text) - published, unpublished, failed
- `published_at` (timestamptz)
- `last_synced_at` (timestamptz)
- `error_message` (text)

---

#### `http_request_queue`
Queue system for external API calls.

**Key Fields:**
- `id` (uuid, PK)
- `url` (text)
- `method` (text) - GET, POST, PUT, DELETE
- `headers` (jsonb)
- `body` (jsonb)
- `status` (text) - pending, processing, completed, failed
- `response` (jsonb)
- `error_message` (text)
- `retry_count` (integer)
- `created_at` (timestamptz)
- `processed_at` (timestamptz)

**Known Issue:** Sometimes contains null URLs (needs investigation)

---

#### `user_profiles`
User profile extensions.

**Key Fields:**
- `id` (uuid, PK, FK → auth.users)
- `full_name` (text)
- `role` (text) - admin, manager, verkoper, eindgebruiker
- `language_preference` (text) - nl, en, de
- `created_at` (timestamptz)

**Triggers:**
- Auto-create on auth.users insert

---

#### `api_credentials`
Secure credential storage.

**Key Fields:**
- `id` (uuid, PK)
- `service_name` (text)
- `api_key` (text) - Encrypted
- `api_secret` (text) - Encrypted
- `additional_config` (jsonb)
- `created_by` (uuid)
- `created_at` (timestamptz)

**Supported Services:**
- mascus
- forklift_international
- openai

---

#### `maintenance_documents`
Service record tracking.

**Key Fields:**
- `id` (uuid, PK)
- `dossier_id` (uuid, FK → dossiers)
- `file_path` (text) - Storage path
- `filename` (text)
- `extracted_data` (jsonb) - AI extraction results
- `manual_review_status` (text) - pending, approved, rejected
- `reviewed_by` (uuid, FK → user_profiles)
- `reviewed_at` (timestamptz)
- `created_at` (timestamptz)

---

### Full Schema Visualization

```
dossiers (main)
├── forklift_details
├── empty_container_handler_details
├── reachstacker_details
├── terminal_tractor_details
├── photos
├── dossier_attachments
├── videos
├── bids
│   └── dealers
├── advertisements
└── maintenance_documents

user_profiles → auth.users

marktdata (standalone)

http_request_queue (standalone)

api_credentials (standalone)
```

---

## Edge Functions

All edge functions are Deno-based and deployed to Supabase.

### 1. `sort-photos-with-ai`
**Purpose:** AI-powered photo categorization

**Trigger:** Manual via API call
**Technology:** OpenAI GPT-4o Vision
**Input:** Array of photo IDs
**Output:** Category assignments with confidence scores

**Categories:**
- voorkant (front)
- achterkant (rear)
- zijkant_links (left side)
- zijkant_rechts (right side)
- mast_voor (mast front)
- mast_achter (mast rear)
- cabine_binnen (cabin interior)
- motor (engine)
- aanbouwdeel (attachment)
- schade (damage)
- banden (tires)
- dashboard
- totaaloverzicht (overview)
- overig (other)

**Cost:** ~$0.01-0.03 per batch (depending on photo count)

**File:** `supabase/functions/sort-photos-with-ai/index.ts`

---

### 2. `extract-maintenance-document`
**Purpose:** Extract data from maintenance PDFs

**Trigger:** Manual via upload
**Technology:** OpenAI GPT-4o + PDF.js
**Input:** PDF file path
**Output:** Structured JSON with extracted fields

**Extracted Fields:**
- Service date
- Running hours
- Service type
- Parts replaced
- Technician notes
- Next service due

**File:** `supabase/functions/extract-maintenance-document/index.ts`

---

### 3. `publish-to-mascus`
**Purpose:** Publish equipment to Mascus marketplace

**Trigger:** Manual via UI
**Technology:** HTTP API integration
**Input:** Dossier ID
**Output:** External advertisement ID

**Features:**
- Create new advertisement
- Update existing
- Upload up to 20 photos
- Map specifications to Mascus format
- Error handling and retry

**File:** `supabase/functions/publish-to-mascus/index.ts`

---

### 4. `publish-to-forklift-international`
**Purpose:** Publish equipment to Forklift International

**Trigger:** Manual via UI
**Technology:** HTTP API integration
**Input:** Dossier ID
**Output:** External advertisement ID

**Features:**
- Create/update advertisements
- Upload up to 30 photos
- Map specifications
- Equipment-specific field mapping

**Known Issues:**
- Field mapping incomplete for ECH/Reachstacker
- Some specifications don't map cleanly

**File:** `supabase/functions/publish-to-forklift-international/index.ts`

---

### 5. `daily-forklift-international-sync`
**Purpose:** Sync published ads with FI platform

**Trigger:** Scheduled (daily via cron)
**Technology:** HTTP API
**Features:**
- Update prices
- Update status
- Sync availability
- Error tracking

**File:** `supabase/functions/daily-forklift-international-sync/index.ts`

---

### 6. `sync-advertisements`
**Purpose:** General advertisement sync

**Trigger:** Manual or scheduled
**Features:**
- Check publication status
- Update local records
- Handle expired ads

**File:** `supabase/functions/sync-advertisements/index.ts`

---

### 7. `send-bid-invitation`
**Purpose:** Email bid invitations to dealers

**Trigger:** Manual via UI
**Technology:** Email API (Resend/SendGrid)
**Input:** Dealer ID, Dossier ID, Custom message
**Output:** Email sent confirmation

**File:** `supabase/functions/send-bid-invitation/index.ts`

---

### 8. `bulk-offer-to-dealers`
**Purpose:** Send offers to multiple dealers

**Trigger:** Manual via UI
**Technology:** Email API
**Input:** Array of dealer IDs, Dossier ID
**Output:** Batch email confirmation

**File:** `supabase/functions/bulk-offer-to-dealers/index.ts`

---

### 9. `create-dealer-account`
**Purpose:** Create Supabase auth account for dealer

**Trigger:** Manual via UI
**Technology:** Supabase Admin API
**Input:** Dealer ID, Email
**Output:** Auth user ID, Password

**Security:** Service role required

**File:** `supabase/functions/create-dealer-account/index.ts`

---

### 10. `import-marktdata`
**Purpose:** Bulk import market data from CSV

**Trigger:** Manual via UI
**Technology:** CSV parsing
**Input:** CSV file with equipment data
**Output:** Import summary

**Features:**
- Field mapping
- Validation
- Duplicate detection
- Error reporting

**File:** `supabase/functions/import-marktdata/index.ts`

---

### 11. `scrape-mascus`
**Purpose:** Web scraping for market data

**Trigger:** Manual via UI
**Technology:** HTTP fetch + HTML parsing
**Input:** Search parameters
**Output:** Scraped equipment data

**Features:**
- Search by equipment type
- Extract specifications
- Download photos
- Store screenshots
- Duplicate detection

**File:** `supabase/functions/scrape-mascus/index.ts`

---

### 12. `extract-pdf-data`
**Purpose:** General PDF data extraction

**Trigger:** API call
**Technology:** PDF.js
**Input:** PDF file path
**Output:** Text content

**File:** `supabase/functions/extract-pdf-data/index.ts`

---

### 13. `fetch-fx-rates`
**Purpose:** Get currency exchange rates

**Trigger:** On-demand or scheduled
**Technology:** Exchange rate API
**Output:** Current rates

**Note:** Not actively used, prepared for multi-currency support

**File:** `supabase/functions/fetch-fx-rates/index.ts`

---

### 14. `delete-user`
**Purpose:** Safely delete user accounts

**Trigger:** Admin action
**Technology:** Supabase Admin API
**Features:**
- Delete from auth.users
- Cascade to user_profiles
- Handle orphaned records

**File:** `supabase/functions/delete-user/index.ts`

---

### 15. `update-user`
**Purpose:** Update user profile and auth

**Trigger:** Admin/Manager action
**Features:**
- Update profile info
- Change role
- Update email

**File:** `supabase/functions/update-user/index.ts`

---

### 16. `create-test-users`
**Purpose:** Development testing

**Trigger:** Manual
**Features:**
- Create test users for all roles
- Known credentials
- Sandbox environment

**File:** `supabase/functions/create-test-users/index.ts`

---

### 17. `reset-test-passwords`
**Purpose:** Reset test user passwords

**Trigger:** Manual

**File:** `supabase/functions/reset-test-passwords/index.ts`

---

## External Integrations

### 1. Mascus API
**Type:** Equipment marketplace
**Authentication:** API key
**Endpoints Used:**
- POST /api/v1/advertisements
- PUT /api/v1/advertisements/{id}
- DELETE /api/v1/advertisements/{id}
- POST /api/v1/photos

**Documentation:** Limited public docs
**Rate Limits:** Unknown
**Status:** Active, some silent failures

---

### 2. Forklift International API
**Type:** Forklift marketplace
**Authentication:** API key + Secret
**Endpoints Used:**
- POST /api/equipment
- PUT /api/equipment/{id}
- DELETE /api/equipment/{id}
- POST /api/photos

**Documentation:** `FORKLIFT_INTERNATIONAL_SETUP.md`
**Rate Limits:** 30 photos per listing
**Status:** Active, field mapping incomplete

---

### 3. OpenAI API
**Type:** AI services
**Authentication:** API key
**Models Used:**
- gpt-4o (vision + text)

**Use Cases:**
- Photo categorization
- Document extraction

**Cost:** ~$0.005 per 1K tokens (input), ~$0.015 per 1K tokens (output)
**Status:** Active

---

### 4. OpenStreetMap / Leaflet
**Type:** Mapping
**Authentication:** None (public)
**Use Cases:**
- Location visualization
- Geographic search

**Status:** Active

---

### 5. Email Service (Resend/SendGrid)
**Type:** Email delivery
**Authentication:** API key
**Use Cases:**
- Bid invitations
- Bulk offers
- Notifications

**Status:** Configuration needed (not fully implemented)

---

## Incomplete Features & Technical Debt

### High Priority

#### 1. HTTP Request Queue Null URL Bug
**Issue:** `http_request_queue` table sometimes has null URLs
**Impact:** Failed publications, no retry
**Location:** Mascus publication flow
**Fix Required:** Add validation, debug insertion points

#### 2. Forklift International Field Mapping
**Issue:** Incomplete mapping for ECH and Reachstackers
**Impact:** Ads missing specifications
**Location:** `publish-to-forklift-international` function
**Fix Required:** Complete field mapping per equipment type
**Documentation:** `FORKLIFT_INTERNATIONAL_FIELD_MAPPING.md`

#### 3. AI Photo Categorization Accuracy
**Issue:** ~85% accuracy, some categories confused
**Impact:** Manual recategorization needed
**Location:** `sort-photos-with-ai` function
**Fix Required:** Better prompts, few-shot examples, model fine-tuning

#### 4. Price Suggestion Algorithm
**Issue:** Basic matching, no ML, no confidence intervals
**Impact:** Poor suggestions for rare equipment
**Location:** `src/utils/priceSuggestion.ts`
**Fix Required:** Implement proper ML model, more data points, weighted scoring

#### 5. Email Service Integration
**Issue:** Email functions exist but no service configured
**Impact:** No automated emails sent
**Location:** Edge functions
**Fix Required:** Configure Resend or SendGrid, add templates

#### 6. Dealer Portal Limitations
**Issue:** Limited functionality, no self-service
**Impact:** Manual work for dealer management
**Fix Required:** Add profile management, communication tools, analytics

---

### Medium Priority

#### 7. Multi-Language Incomplete
**Issue:** Not all screens/components translated
**Impact:** Mixed language experience
**Location:** Various components
**Fix Required:** Complete translation coverage, add missing keys

#### 8. Publication Error Handling
**Issue:** Silent failures, no user notification
**Impact:** Users don't know publication failed
**Location:** Publication edge functions
**Fix Required:** Better error messages, user notifications, retry UI

#### 9. Analytics Dashboard
**Issue:** No business intelligence beyond basic counts
**Impact:** No insights into sales trends, dealer performance
**Location:** Dashboard pages
**Fix Required:** Build comprehensive analytics, charts, reports

#### 10. Maintenance Document Workflow
**Issue:** No batch processing, limited extraction formats
**Impact:** Slow document processing
**Location:** Maintenance upload component
**Fix Required:** Batch UI, OCR for scanned docs, better extraction

#### 11. Customer Portal Features
**Issue:** Basic display only, no interaction
**Impact:** Limited customer engagement
**Location:** `CustomerPortalPage.tsx`
**Fix Required:** Add inquiry forms, comparison tools, saved searches

#### 12. Bid Management Tools
**Issue:** No comparison, no expiration, limited tracking
**Impact:** Manual bid management
**Location:** Bid components
**Fix Required:** Add bid comparison, auto-expiration, notifications

---

### Low Priority

#### 13. Web Scraping Sources
**Issue:** Only Mascus, manual trigger
**Impact:** Limited market data
**Location:** `scrape-mascus` function
**Fix Required:** Add more sources, scheduled scraping

#### 14. Search Performance
**Issue:** No full-text search, basic SQL LIKE queries
**Impact:** Slow search on large datasets
**Location:** Search components
**Fix Required:** Implement PostgreSQL full-text search or Algolia

#### 15. File Size Limits
**Issue:** Hardcoded limits, no compression
**Impact:** Large files rejected
**Location:** Upload components
**Fix Required:** Implement client-side compression, chunked uploads

#### 16. Video Processing
**Issue:** No transcoding, large files
**Impact:** Slow video loading
**Location:** Video upload
**Fix Required:** Add transcoding, thumbnails, streaming

#### 17. Backup System
**Issue:** Manual backup via script
**Impact:** Risk of data loss
**Location:** `backup-script/`
**Fix Required:** Automated scheduled backups, backup verification

#### 18. Testing
**Issue:** No automated tests
**Impact:** Regression risk
**Location:** N/A
**Fix Required:** Add unit tests, integration tests, E2E tests

#### 19. Error Logging
**Issue:** Console logs only, no centralized logging
**Impact:** Difficult debugging in production
**Location:** Throughout app
**Fix Required:** Implement Sentry or similar

#### 20. API Documentation
**Issue:** No API docs for internal APIs
**Impact:** Difficult integration
**Location:** N/A
**Fix Required:** Generate OpenAPI specs, add Swagger UI

---

## Known Issues

### Critical

1. **HTTP Queue Null URLs**
   - Status: Unresolved
   - Frequency: Occasional
   - Workaround: Manual database cleanup

2. **Mascus Silent Failures**
   - Status: Investigating
   - Frequency: ~10% of publications
   - Workaround: Manual republish

### Major

3. **AI Photo Sort Wrong Categories**
   - Status: Known limitation
   - Frequency: ~15% of photos
   - Workaround: Manual override

4. **FI Field Mapping Incomplete**
   - Status: Documented in `FORKLIFT_INTERNATIONAL_FIELD_MAPPING.md`
   - Impact: Missing specs in FI ads
   - Workaround: Manual edit in FI dashboard

5. **Price Suggestions Off**
   - Status: Algorithm needs improvement
   - Frequency: ~30% inaccurate
   - Workaround: Manual override

### Minor

6. **Mixed Language UI**
   - Status: Translations incomplete
   - Impact: UX inconsistency
   - Workaround: Use Dutch primarily

7. **Search Slow with 1000+ Dossiers**
   - Status: Need indexing improvements
   - Impact: Performance degradation
   - Workaround: Use filters

8. **Email Functions Not Configured**
   - Status: Needs email service setup
   - Impact: No automated emails
   - Workaround: Manual emails

9. **No Mobile Responsiveness**
   - Status: Desktop-first design
   - Impact: Poor mobile UX
   - Workaround: Use desktop

10. **Large File Upload Failures**
    - Status: No chunking implemented
    - Impact: Videos > 100MB fail
    - Workaround: Compress before upload

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key (for AI features)

### Environment Variables
Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

---

## Database Migrations

All migrations are in `supabase/migrations/`

**Important:** Run migrations in order by timestamp.

### Initial Setup
1. Create Supabase project
2. Run all migrations sequentially
3. Set up storage buckets
4. Configure RLS policies

### Migration Strategy
- Never edit existing migrations
- Create new migration for changes
- Test in development first
- Use descriptive filenames
- Include rollback instructions

---

## Deployment

### Frontend
- Build with `npm run build`
- Deploy `dist/` folder to hosting
- Configure environment variables

### Edge Functions
- Deploy via Supabase CLI or API
- Use provided MCP tools
- Configure secrets in Supabase dashboard

### Database
- Migrations auto-applied in Supabase
- Or use Supabase CLI: `supabase db push`

---

## Security Considerations

### Implemented
✅ Row Level Security on all tables
✅ Service role for admin functions
✅ Authenticated-only write access
✅ Public read policies for customer portal
✅ Secure credential storage
✅ Password hashing (Supabase Auth)

### Missing
❌ API rate limiting
❌ File upload virus scanning
❌ SQL injection protection testing
❌ XSS protection audit
❌ CSRF tokens
❌ Content Security Policy headers
❌ Security audit

---

## Performance Optimization Needs

### Database
- Add indexes for search columns
- Implement full-text search
- Optimize complex queries
- Add materialized views for dashboards

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Bundle size reduction (currently 2.3MB)

### Edge Functions
- Response caching
- Concurrent processing
- Batch operations
- Connection pooling

---

## Future Enhancements (Wishlist)

### Phase 1 - Core Improvements
1. Complete AI photo categorization training
2. Fix HTTP queue null URL bug
3. Complete Forklift International mapping
4. Implement email service
5. Add proper error logging

### Phase 2 - Feature Completion
1. Build comprehensive analytics
2. Enhance dealer portal
3. Add customer inquiry system
4. Implement bid comparison tools
5. Add automated testing

### Phase 3 - Scale & Performance
1. Implement full-text search
2. Add caching layer
3. Optimize database queries
4. Implement CDN for media
5. Add mobile app

### Phase 4 - Advanced Features
1. Machine learning price predictions
2. Automated market reports
3. Integration with more marketplaces
4. API for third-party integrations
5. Multi-tenant support

---

## Contact & Support

For technical questions or issues, contact the development team.

**Internal Documentation:**
- See `/project/*.md` files for specific module documentation
- Database schema: Check migration files
- API endpoints: See edge function files

---

## Appendices

### A. File Structure
```
project/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── contexts/       # React contexts
│   ├── lib/            # Supabase client
│   ├── utils/          # Utilities
│   └── main.tsx        # Entry point
├── supabase/
│   ├── functions/      # Edge functions
│   └── migrations/     # DB migrations
├── public/             # Static assets
├── backup-script/      # Database backup
└── *.md               # Documentation
```

### B. Key Dependencies
- `@supabase/supabase-js` - Supabase client
- `react` - UI framework
- `jspdf` - PDF generation
- `xlsx` - Excel export
- `leaflet` - Maps
- `lucide-react` - Icons
- `pdf-lib` - PDF manipulation

### C. Naming Conventions
- **Database:** snake_case
- **TypeScript:** camelCase
- **Components:** PascalCase
- **Files:** PascalCase for components, camelCase for utils
- **Dossier Numbers:** HCL26-XXX format

---

**Document Version:** 1.0
**Generated:** February 10, 2026
**Status:** Living Document - Update as features change
