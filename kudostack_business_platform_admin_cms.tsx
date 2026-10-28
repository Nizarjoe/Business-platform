import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Code2,
  Sparkles,
  CalendarHeart,
  Layout,
  Building2,
  Palette,
  Cpu,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Eye,
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit3,
  Save,
  Search,
  Filter,
  Mail,
  MessageSquare,
  Globe,
  Clock,
  MapPin,
  Heart,
  Share2,
  Send,
  Database,
  Settings,
  FileCode,
  FolderKanban,
  Briefcase,
  HelpCircle,
  Inbox,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Smartphone,
  Monitor,
  Terminal,
  BookOpen,
  UserCheck
} from 'lucide-react';

// ============================================================================
// 1. INITIAL DATA & HONEST DEMO SEED (NO FAKE STATS OR FAKE REVIEWS)
// ============================================================================

const INITIAL_SITE_SETTINGS = {
  brandName: 'KudoStack',
  tagline: 'Build Digital Experiences. Create Lasting Impressions.',
  altTagline: 'From Vision to Digital Reality.',
  heroHeadline: 'Turning Ideas Into Exceptional Digital Experiences.',
  heroSubheadline:
    'KudoStack membantu bisnis, profesional, dan individu membangun pengalaman digital melalui website modern, undangan digital elegan, dan solusi teknologi yang dirancang sesuai kebutuhan.',
  aboutHeadline: 'Thoughtful Design. Purposeful Technology.',
  aboutDescription:
    'KudoStack berfokus pada pengembangan pengalaman digital yang menggabungkan estetika editorial, arsitektur perangkat lunak modern, dan fungsionalitas yang berorientasi pada pengguna. Kami percaya setiap piksel dan baris kode harus memiliki tujuan yang jelas.',
  contactHeadline: 'Have an Idea? Let’s Make It Real.',
  businessEmail: 'hello@kudostack.dev',
  whatsappNumber: '', // Dikosongkan secara jujur sampai pemilik mengonfigurasi di Admin CMS
  accentPrimary: '#8B5CF6',
  accentSecondary: '#22D3EE',
  showTestimonialsSection: false, // Default disembunyikan karena belum ada ulasan nyata
  seoTitle: 'KudoStack — Digital Product Studio, Web Development & Digital Invitations',
  seoDescription:
    'Studio teknologi dan layanan digital untuk pembuatan website modern, landing page bisnis, aplikasi web kustom, dan undangan digital interaktif.',
  socialLinks: {
    instagram: 'https://instagram.com/kudostack',
    linkedin: 'https://linkedin.com/company/kudostack',
    github: 'https://github.com/kudostack'
  }
};

const INITIAL_SERVICES = [
  {
    id: 'srv-1',
    title: 'Website Development',
    slug: 'website-development',
    iconName: 'Code2',
    description:
      'Website modern, responsif, cepat, dan dibangun dengan arsitektur kode yang bersih sesuai kebutuhan spesifik bisnis Anda.',
    deliverables: ['Responsive Architecture', 'SEO Semantic Structure', 'Fast Performance'],
    order: 1,
    published: true
  },
  {
    id: 'srv-2',
    title: 'Digital Invitations',
    slug: 'digital-invitations',
    iconName: 'CalendarHeart',
    description:
      'Website undangan pernikahan, acara formal, ulang tahun, dan acara eksklusif dengan fitur RSVP dan buku tamu interaktif.',
    deliverables: ['Custom Theme & Motion', 'Real-time RSVP & Wishes', 'WhatsApp Guest Sharing'],
    order: 2,
    published: true
  },
  {
    id: 'srv-3',
    title: 'Business Landing Pages',
    slug: 'business-landing-pages',
    iconName: 'Layout',
    description:
      'Landing page berorientasi konversi untuk promosi layanan, peluncuran produk baru, dan kampanye pemasaran digital.',
    deliverables: ['Conversion-Focused UI', 'Clear CTA Hierarchy', 'Analytics Ready'],
    order: 3,
    published: true
  },
  {
    id: 'srv-4',
    title: 'Company Profile',
    slug: 'company-profile',
    iconName: 'Building2',
    description:
      'Website kredibel dan profesional untuk memperkenalkan profil perusahaan, katalog layanan, dan memperkuat identitas brand.',
    deliverables: ['Brand Identity Alignment', 'Content Management', 'Multi-device Ready'],
    order: 4,
    published: true
  },
  {
    id: 'srv-5',
    title: 'UI/UX Design',
    slug: 'ui-ux-design',
    iconName: 'Palette',
    description:
      'Perancangan antarmuka yang intuitif, design system yang konsisten, serta alur pengalaman pengguna yang terstruktur.',
    deliverables: ['Design System & Tokens', 'Interactive Prototypes', 'Usability Architecture'],
    order: 5,
    published: true
  },
  {
    id: 'srv-6',
    title: 'Custom Web Applications',
    slug: 'custom-web-applications',
    iconName: 'Cpu',
    description:
      'Pengembangan dashboard internal, sistem informasi manajemen, dan aplikasi web berbasis kebutuhan operasional proyek.',
    deliverables: ['Custom CRUD & Logic', 'Role-based Access', 'Scalable Database Schema'],
    order: 6,
    published: true
  }
];

const INITIAL_PROJECTS = [
  {
    id: 'prj-1',
    title: 'Aethelgard & Sora — Bespoke Wedding',
    slug: 'aethelgard-sora-wedding',
    category: 'Digital Invitations',
    isConcept: true,
    badgeLabel: 'CONCEPT DEMO',
    summary:
      'Eksplorasi website undangan pernikahan bertema editorial dengan transisi pembuka halus, hitung mundur waktu acara, dan sistem RSVP terintegrasi.',
    challenge:
      'Menciptakan pengalaman undangan digital yang terasa intim dan mewah tanpa mengorbankan kecepatan muat pada perangkat seluler tamu.',
    solution:
      'Menggunakan tipografi kontras tinggi, optimasi aset SVG ringan, serta navigasi satu jari yang intuitif untuk pengisian konfirmasi kehadiran.',
    techStack: ['Next.js', 'Tailwind CSS', 'Framer Motion', 'PostgreSQL'],
    previewTheme: 'from-violet-600/30 via-fuchsia-500/20 to-cyan-500/20',
    accentColor: '#A855F7',
    order: 1,
    published: true,
    linkedInvitationId: 'inv-1'
  },
  {
    id: 'prj-2',
    title: 'Vortexa Studio — Creative Agency Landing',
    slug: 'vortexa-creative-studio',
    category: 'Websites',
    isConcept: true,
    badgeLabel: 'CONCEPT DEMO',
    summary:
      'Konsep landing page untuk agensi desain digital dengan tata letak bento asimetris, tipografi berani, dan alur konversi terfokus.',
    challenge:
      'Menyajikan portofolio visual yang kompleks dalam satu halaman tanpa membuat pengunjung merasa kewalahan oleh informasi.',
    solution:
      'Menerapkan hierarki visual gelap (dark mode) dengan ruang kosong terukur dan interaksi mikro pada setiap kartu studi kasus.',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Lucide Icons'],
    previewTheme: 'from-cyan-500/30 via-blue-600/20 to-indigo-700/20',
    accentColor: '#22D3EE',
    order: 2,
    published: true
  },
  {
    id: 'prj-3',
    title: 'PulseMetric — SaaS Telemetry Dashboard',
    slug: 'pulsemetric-saas-dashboard',
    category: 'Web Applications',
    isConcept: true,
    badgeLabel: 'ARCHITECTURE CONCEPT',
    summary:
      'Purwarupa antarmuka aplikasi web untuk pemantauan metrik operasional bisnis, manajemen pengguna, dan pelaporan data real-time.',
    challenge:
      'Menampilkan tabel data padat dan grafik analitik agar tetap mudah dipindai di layar laptop maupun tablet.',
    solution:
      'Merancang sistem grid modular dengan filter instan, indikator status berbasis warna semantik, dan panel detail kontekstual.',
    techStack: ['Next.js App Router', 'TypeScript', 'Neon Postgres', 'Tailwind CSS'],
    previewTheme: 'from-emerald-500/25 via-teal-600/20 to-cyan-700/20',
    accentColor: '#10B981',
    order: 3,
    published: true
  },
  {
    id: 'prj-4',
    title: 'ArkaNusa — Corporate Energy Profile',
    slug: 'arkanusa-corporate-profile',
    category: 'Websites',
    isConcept: true,
    badgeLabel: 'CONCEPT DEMO',
    summary:
      'Desain website company profile modern untuk perusahaan infrastruktur dan teknologi hijau dengan fokus pada kredibilitas korporat.',
    challenge:
      'Menghadirkan citra perusahaan yang formal dan tepercaya namun tetap terasa segar dan relevan dengan era teknologi modern.',
    solution:
      'Mengombinasikan tata letak grid editorial dengan struktur informasi layanan yang jelas dan halaman kontak langsung.',
    techStack: ['Next.js', 'Tailwind CSS', 'SEO Schema', 'Responsive Grid'],
    previewTheme: 'from-blue-500/30 via-indigo-600/20 to-violet-700/20',
    accentColor: '#6366F1',
    order: 4,
    published: true
  },
  {
    id: 'prj-5',
    title: 'Kinetix Design System & UI Kit',
    slug: 'kinetix-design-system',
    category: 'UI/UX',
    isConcept: true,
    badgeLabel: 'DESIGN SYSTEM DEMO',
    summary:
      'Dokumentasi token desain, pustaka komponen tombol, form input validasi, dan panduan aksesibilitas kontras warna untuk aplikasi web.',
    challenge:
      'Menjaga konsistensi antarmuka antara tim desain dan pengembang saat membangun produk digital berskala menengah.',
    solution:
      'Menyusun komponen berbasis variabel warna, skala tipografi modular, dan aturan states (hover, focus, disabled) yang terdokumentasi.',
    techStack: ['Figma Tokens', 'React Components', 'WCAG Contrast', 'Tailwind'],
    previewTheme: 'from-fuchsia-500/25 via-purple-600/20 to-indigo-800/20',
    accentColor: '#EC4899',
    order: 5,
    published: true
  }
];

const INITIAL_INVITATION_TEMPLATES = [
  {
    id: 'inv-1',
    name: 'Elegant Wedding',
    slug: 'elegant-wedding',
    badge: 'DEMO THEME',
    styleCategory: 'Timeless Editorial',
    coupleOrHost: 'Julian Vance & Clara Moretti',
    eventTitle: 'The Wedding Celebration',
    eventDate: '2027-02-14T16:00:00',
    eventDateDisplay: 'Minggu, 14 Februari 2027',
    eventTimeDisplay: '16.00 WIB — Selesai',
    venueName: 'Glasshouse Botanical Pavilion',
    venueAddress: 'Jl. Lembah Pinus No. 88, Kawasan Bukit Sejuk (Alamat Simulasi Demo)',
    storyText:
      'Semua bermula dari percakapan singkat mengenai arsitektur dan kopi di sore hari. Kini, kami mengundang Anda untuk menjadi bagian dari babak baru perjalanan hidup kami dalam suasana hangat dan penuh syukur.',
    colorScheme: {
      bg: '#0E121E',
      card: '#161C2E',
      accent: '#C084FC',
      text: '#F8FAFC',
      border: 'rgba(192, 132, 252, 0.25)'
    },
    galleryCaptions: [
      'Pre-wedding Session — Autumn Walk (Demo Asset)',
      'Architectural Portrait Studio (Demo Asset)',
      'Evening Silhouette Concept (Demo Asset)'
    ],
    published: true
  },
  {
    id: 'inv-2',
    name: 'Modern Minimalist',
    slug: 'modern-minimalist',
    badge: 'DEMO THEME',
    styleCategory: 'Clean Monochrome & Cyan',
    coupleOrHost: 'Reza Prakasa & Nadia Kinanti',
    eventTitle: 'Intimate Reception & Vows',
    eventDate: '2027-04-24T10:00:00',
    eventDateDisplay: 'Sabtu, 24 April 2027',
    eventTimeDisplay: '10.00 WIB — 13.00 WIB',
    venueName: 'Kudo Space Art Gallery',
    venueAddress: 'Gedung Kreatif Blok C-12, Jakarta Selatan (Alamat Simulasi Demo)',
    storyText:
      'Dalam kesederhanaan, kami menemukan makna kebersamaan yang sesungguhnya. Kehadiran dan doa restu Anda adalah hadiah terindah bagi langkah awal keluarga kecil kami.',
    colorScheme: {
      bg: '#090D16',
      card: '#111827',
      accent: '#22D3EE',
      text: '#F9FAFB',
      border: 'rgba(34, 211, 238, 0.25)'
    },
    galleryCaptions: [
      'Minimalist Monochrome Portrait (Demo Asset)',
      'Candid Coffee Morning (Demo Asset)',
      'Ring & Typography Detail (Demo Asset)'
    ],
    published: true
  },
  {
    id: 'inv-3',
    name: 'Floral Romantic',
    slug: 'floral-romantic',
    badge: 'DEMO THEME',
    styleCategory: 'Soft Botanical Glow',
    coupleOrHost: 'Adrian Wijaya & Sofia Larasati',
    eventTitle: 'Garden Ceremony & Dinner',
    eventDate: '2027-06-12T15:30:00',
    eventDateDisplay: 'Sabtu, 12 Juni 2027',
    eventTimeDisplay: '15.30 WIB — 20.00 WIB',
    venueName: 'Orchid Terrace Sanctuary',
    venueAddress: 'Jl. Kebun Raya No. 42, Bandung Utara (Alamat Simulasi Demo)',
    storyText:
      'Layaknya taman yang tumbuh mekar di musim semi, perjalanan kami dipenuhi warna dan harapan. Kami menantikan kehadiran Anda di sore yang penuh kehangatan ini.',
    colorScheme: {
      bg: '#16111C',
      card: '#231A2C',
      accent: '#F472B6',
      text: '#FDF2F8',
      border: 'rgba(244, 114, 182, 0.25)'
    },
    galleryCaptions: [
      'Botanical Greenhouse Concept (Demo Asset)',
      'Golden Hour Meadow (Demo Asset)',
      'Floral Table Setting Preview (Demo Asset)'
    ],
    published: true
  },
  {
    id: 'inv-4',
    name: 'Luxury Dark',
    slug: 'luxury-dark',
    badge: 'DEMO THEME',
    styleCategory: 'Midnight Gold & Obsidian',
    coupleOrHost: 'KudoStack Executive Summit 2027',
    eventTitle: 'Annual Private Gala & Product Showcase',
    eventDate: '2027-08-20T19:00:00',
    eventDateDisplay: 'Jumat, 20 Agustus 2027',
    eventTimeDisplay: '19.00 WIB — 22.00 WIB',
    venueName: 'The Obsidian Ballroom',
    venueAddress: 'Menara Sentral Lt. 45, Kawasan Bisnis Utama (Alamat Simulasi Demo)',
    storyText:
      'Undangan eksklusif untuk malam apresiasi inovasi teknologi, peluncuran produk digital, dan jejaring strategis bersama para pemimpin industri.',
    colorScheme: {
      bg: '#070709',
      card: '#121218',
      accent: '#FBBF24',
      text: '#FAFAFA',
      border: 'rgba(251, 191, 36, 0.3)'
    },
    galleryCaptions: [
      'Keynote Stage Lighting Concept (Demo Asset)',
      'Executive Networking Lounge (Demo Asset)',
      'Gala Dinner Ambience (Demo Asset)'
    ],
    published: true
  },
  {
    id: 'inv-5',
    name: 'Traditional Contemporary',
    slug: 'traditional-contemporary',
    badge: 'DEMO THEME',
    styleCategory: 'Heritage Geometric Fusion',
    coupleOrHost: 'Bagas Danuarta & Sekar Ayuningtyas',
    eventTitle: 'Akad & Resepsi Pernikahan Nusantara',
    eventDate: '2027-09-18T08:30:00',
    eventDateDisplay: 'Sabtu, 18 September 2027',
    eventTimeDisplay: '08.30 WIB — 14.00 WIB',
    venueName: 'Pendopo Agung Heritage Hall',
    venueAddress: 'Jl. Wijaya Kusuma No. 19, Yogyakarta (Alamat Simulasi Demo)',
    storyText:
      'Memadukan nilai luhur tradisi budaya dengan sentuhan estetika masa kini. Merupakan kehormatan besar bagi keluarga kami apabila Bapak/Ibu/Saudara/i berkenan hadir memberikan doa restu.',
    colorScheme: {
      bg: '#0D131A',
      card: '#16202B',
      accent: '#38BDF8',
      text: '#F0F9FF',
      border: 'rgba(56, 189, 248, 0.25)'
    },
    galleryCaptions: [
      'Contemporary Heritage Attire (Demo Asset)',
      'Pendopo Architectural Detail (Demo Asset)',
      'Cultural Ceremony Concept (Demo Asset)'
    ],
    published: true
  }
];

const INITIAL_FAQS = [
  {
    id: 'faq-1',
    question: 'Apa saja layanan utama yang disediakan oleh KudoStack?',
    answer:
      'KudoStack menyediakan layanan pengembangan website kustom (Website Development), pembuatan website undangan digital interaktif (Digital Invitations), Business Landing Pages, Company Profile, perancangan UI/UX Design, serta pengembangan aplikasi web atau dashboard sesuai spesifikasi kebutuhan klien.',
    published: true
  },
  {
    id: 'faq-2',
    question: 'Apakah website atau undangan digital bisa dibuat sesuai kebutuhan khusus?',
    answer:
      'Ya. Setiap proyek di KudoStack dirancang berdasarkan diskusi kebutuhan (tahap Discover). Anda dapat menyesuaikan struktur halaman, identitas warna brand, fitur interaktif, hingga integrasi formulir sesuai tujuan acara atau bisnis Anda.',
    published: true
  },
  {
    id: 'faq-3',
    question: 'Apakah seluruh website dan undangan digital dapat diakses dengan optimal di smartphone?',
    answer:
      'Tentu. Kami menerapkan pendekatan Mobile-First dan Responsive Design pada seluruh proyek, sehingga tampilan, navigasi, dan tombol interaksi tetap nyaman diakses baik melalui smartphone ukuran kecil, tablet, laptop, maupun monitor desktop besar.',
    published: true
  },
  {
    id: 'faq-4',
    question: 'Apa saja fitur yang tersedia pada layanan Undangan Digital KudoStack?',
    answer:
      'Undangan digital kami mendukung halaman sampul dengan nama tamu, animasi pembuka yang halus, informasi waktu dan lokasi acara, hitung mundur (countdown), galeri visual, cerita acara, integrasi penunjuk peta lokasi, formulir RSVP & ucapan buku tamu, serta kemudahan berbagi tautan melalui WhatsApp.',
    published: true
  },
  {
    id: 'faq-5',
    question: 'Bagaimana alur proses pemesanan proyek di KudoStack?',
    answer:
      'Proses dimulai dengan mengisi formulir Project Inquiry pada halaman ini. Kami kemudian mendiskusikan ruang lingkup kebutuhan Anda (01 Discover), menyusun rancangan tampilan (02 Design), membangun sistem dan kode (03 Develop), hingga pengujian serta peluncuran (04 Launch).',
    published: true
  },
  {
    id: 'faq-6',
    question: 'Apakah konten website dapat diperbarui setelah proyek selesai?',
    answer:
      'Ya. Untuk proyek website bisnis atau portofolio yang membutuhkan pembaruan berkala, kami dapat menyediakan sistem manajemen konten (Admin CMS) sehingga Anda dapat memperbarui teks, item portofolio, atau informasi kontak tanpa perlu mengubah kode secara manual.',
    published: true
  },
  {
    id: 'faq-7',
    question: 'Bagaimana cara mendapatkan estimasi biaya dan waktu pengerjaan?',
    answer:
      'Estimasi biaya dan durasi pengerjaan bergantung pada kompleksitas fitur, jumlah halaman, dan kebutuhan integrasi proyek Anda. Silakan kirimkan rincian ide atau kebutuhan Anda melalui formulir kontak di bawah agar kami dapat menyusun proposal estimasi yang transparan dan akurat.',
    published: true
  }
];

// Tidak ada testimoni palsu; daftar kosong secara jujur hingga diinput oleh Admin
const INITIAL_TESTIMONIALS = [];

// Contoh satu inquiry sistem internal berlabel jelas agar Admin dapat menguji antarmuka CMS
const INITIAL_INQUIRIES = [
  {
    id: 'inq-demo-1',
    name: 'Tim Internal KudoStack (Contoh Data Pengujian)',
    email: 'test-inquiry@kudostack.dev',
    whatsapp: '+6281200000000',
    company: 'Internal System Verification',
    serviceType: 'Website Development',
    budgetRange: 'Rp 5.000.000 - Rp 15.000.000',
    targetTimeline: '1 - 2 Bulan',
    message:
      'Ini adalah entri pengujian sistem untuk memverifikasi bahwa modul Inquiry Management di Admin Dashboard dapat membaca, memfilter, dan memperbarui status pesan secara real-time.',
    status: 'new', // 'new' | 'reviewed' | 'followed_up'
    createdAt: '2026-10-28 19:30 WIB',
    isSystemSample: true
  }
];

const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Discover',
    subtitle: 'Pemahaman & Strategi',
    description:
      'Memahami kebutuhan fungsional, tujuan bisnis, profil target pengguna, serta karakter identitas brand klien secara mendalam sebelum menentukan solusi teknis.'
  },
  {
    number: '02',
    title: 'Design',
    subtitle: 'Arsitektur & Visual UI/UX',
    description:
      'Menyusun struktur informasi, wireframe, sistem tipografi, palet warna, dan konsep visual interaktif yang berorientasi pada kenyamanan pengguna.'
  },
  {
    number: '03',
    title: 'Develop',
    subtitle: 'Implementasi Kode & Sistem',
    description:
      'Menerjemahkan desain menjadi website atau aplikasi web yang responsif, cepat, aman, dan terstruktur dengan standar pengembangan modern.'
  },
  {
    number: '04',
    title: 'Launch',
    subtitle: 'Pengujian & Deployment',
    description:
      'Melakukan pengujian lintas perangkat, optimasi performa, konfigurasi deployment produksi, serta serah terima akses pengelolaan kepada klien.'
  }
];

// ============================================================================
// 2. HELPER COMPONENTS (BRAND LOGO, DYNAMIC ICON, SQL SCHEMA VIEWER)
// ============================================================================

const KudoStackLogo = ({ brandName = 'KudoStack', size = 'md' }) => {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="inline-flex items-center gap-2.5 select-none group">
      <div
        className={`${iconSize} relative rounded-xl bg-gradient-to-br from-violet-600 via-violet-500 to-cyan-400 p-[1px] shadow-lg shadow-violet-500/20 group-hover:shadow-cyan-400/25 transition-all duration-300`}
      >
        <div className="w-full h-full bg-[#080B14] rounded-[11px] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 to-cyan-400/20 opacity-80" />
          {/* Original Geometric KudoStack Symbol (Layered Isometric Stack + K Vector) */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            className="w-5 h-5 relative z-10 transform group-hover:scale-105 transition-transform duration-300"
          >
            <path
              d="M16 4L27 10.5L16 17L5 10.5L16 4Z"
              stroke="url(#kudoGrad1)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 16.5L16 23L27 16.5"
              stroke="#22D3EE"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 22.5L16 27L23.5 22.5"
              stroke="#8B5CF6"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="kudoGrad1" x1="5" y1="4" x2="27" y2="17" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <span className={`${textSize} font-bold tracking-tight text-[#F8FAFC] flex items-center`}>
        {brandName.replace(/Stack$/i, '')}
        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          {brandName.match(/Stack$/i) ? 'Stack' : ''}
        </span>
      </span>
    </div>
  );
};

const ServiceIcon = ({ name, className = 'w-6 h-6' }) => {
  const icons = {
    Code2: <Code2 className={className} />,
    CalendarHeart: <CalendarHeart className={className} />,
    Layout: <Layout className={className} />,
    Building2: <Building2 className={className} />,
    Palette: <Palette className={className} />,
    Cpu: <Cpu className={className} />,
    Layers: <Layers className={className} />,
    Globe: <Globe className={className} />
  };
  return icons[name] || <Layers className={className} />;
};

const POSTGRES_SCHEMA_SQL = `-- ============================================================================
-- KUDOSTACK PRODUCTION DATABASE SCHEMA (PostgreSQL / Neon Serverless)
-- Ready for Next.js App Router + Drizzle ORM / Prisma / @neondatabase/serverless
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SITE SETTINGS
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name VARCHAR(100) NOT NULL DEFAULT 'KudoStack',
  tagline VARCHAR(255) NOT NULL,
  hero_headline TEXT NOT NULL,
  hero_subheadline TEXT NOT NULL,
  about_headline TEXT NOT NULL,
  about_description TEXT NOT NULL,
  business_email VARCHAR(160),
  whatsapp_number VARCHAR(40),
  accent_primary VARCHAR(20) DEFAULT '#8B5CF6',
  accent_secondary VARCHAR(20) DEFAULT '#22D3EE',
  show_testimonials BOOLEAN DEFAULT FALSE,
  seo_title VARCHAR(160),
  seo_description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SERVICES
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(140) NOT NULL,
  slug VARCHAR(160) UNIQUE NOT NULL,
  icon_name VARCHAR(60) NOT NULL DEFAULT 'Layers',
  description TEXT NOT NULL,
  deliverables JSONB DEFAULT '[]'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PORTFOLIO PROJECTS
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  category VARCHAR(80) NOT NULL,
  is_concept BOOLEAN NOT NULL DEFAULT TRUE,
  badge_label VARCHAR(60) DEFAULT 'CONCEPT DEMO',
  summary TEXT NOT NULL,
  challenge TEXT,
  solution TEXT,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DIGITAL INVITATION TEMPLATES
CREATE TABLE invitation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(140) NOT NULL,
  slug VARCHAR(160) UNIQUE NOT NULL,
  style_category VARCHAR(120) NOT NULL,
  couple_or_host VARCHAR(180) NOT NULL,
  event_title VARCHAR(180) NOT NULL,
  event_date TIMESTAMPTZ,
  venue_name VARCHAR(180),
  venue_address TEXT,
  story_text TEXT,
  color_scheme JSONB NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PROJECT INQUIRIES (CLIENT LEADS)
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(140) NOT NULL,
  client_email VARCHAR(160) NOT NULL,
  whatsapp_number VARCHAR(50),
  company_name VARCHAR(140),
  service_type VARCHAR(100) NOT NULL,
  budget_range VARCHAR(100),
  target_timeline VARCHAR(100),
  project_description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'new', -- 'new' | 'reviewed' | 'followed_up'
  ip_rate_key VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. FAQS & TESTIMONIALS
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(140) NOT NULL,
  client_role VARCHAR(140),
  quote TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ADMIN ROLES (Server-side Auth Mapping e.g. Clerk / NextAuth)
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id VARCHAR(180) UNIQUE NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

// ============================================================================
// 3. MAIN APPLICATION COMPONENT
// ============================================================================

export default function KudoStackApp() {
  // Navigation & Route View State: 'public' | 'invitation-demo' | 'admin'
  const [currentRoute, setCurrentRoute] = useState('public');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Pointer Subtle Glow (Desktop)
  const [pointerPos, setPointerPos] = useState({ x: 50, y: 25 });

  // Dynamic CMS Database State (Single Source of Truth in Session)
  const [siteSettings, setSiteSettings] = useState(INITIAL_SITE_SETTINGS);
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [invitationTemplates, setInvitationTemplates] = useState(INITIAL_INVITATION_TEMPLATES);
  const [faqs, setFaqs] = useState(INITIAL_FAQS);
  const [testimonials, setTestimonials] = useState(INITIAL_TESTIMONIALS);
  const [inquiries, setInquiries] = useState(INITIAL_INQUIRIES);

  // Portfolio Filter & Detail Modal State
  const [activePortfolioCategory, setActivePortfolioCategory] = useState('All Projects');
  const [selectedProjectModal, setSelectedProjectModal] = useState(null);

  // Digital Invitation Demo Engine State
  const [activeInvitationId, setActiveInvitationId] = useState('inv-1');
  const [isInvitationOpened, setIsInvitationOpened] = useState(false);
  const [guestNameParam, setGuestNameParam] = useState('Bapak/Ibu/Rekan Kehormatan');
  const [rsvpEntries, setRsvpEntries] = useState({
    'inv-1': [
      {
        id: 'w-1',
        name: 'Dimas & Keluarga (Simulasi Demo)',
        attendance: 'Hadir',
        message: 'Selamat menempuh hidup baru! Semoga selalu diberkahi kebahagiaan.',
        time: 'Baru saja'
      }
    ]
  });
  const [rsvpForm, setRsvpForm] = useState({ name: '', attendance: 'Hadir', guests: '1', message: '' });
  const [rsvpNotice, setRsvpNotice] = useState('');

  // FAQ Accordion State
  const [openFaqId, setOpenFaqId] = useState('faq-1');

  // Public Contact / Project Inquiry Form State
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    company: '',
    serviceType: 'Website Development',
    budgetRange: '',
    targetTimeline: '',
    message: '',
    honeypot: '' // Anti-spam trap
  });
  const [inquiryErrors, setInquiryErrors] = useState({});
  const [inquiryStatus, setInquiryStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [lastSubmittedInquiry, setLastSubmittedInquiry] = useState(null);

  // Admin Authentication & CMS State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState('overview');
  const [adminToast, setAdminToast] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Admin Editing Forms State
  const [editingProject, setEditingProject] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [editingInvitation, setEditingInvitation] = useState(null);
  const [newFaqForm, setNewFaqForm] = useState({ question: '', answer: '' });
  const [newTestimonialForm, setNewTestimonialForm] = useState({
    clientName: '',
    clientRole: '',
    quote: ''
  });

  // Scroll listener for sticky blurred navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show temporary notification in Admin CMS
  const triggerAdminToast = (message, type = 'success') => {
    setAdminToast({ message, type });
    setTimeout(() => {
      setAdminToast(null);
    }, 3500);
  };

  // Filtered published entities for Public Website
  const publishedServices = useMemo(
    () => [...services].filter((s) => s.published).sort((a, b) => a.order - b.order),
    [services]
  );

  const publishedProjects = useMemo(() => {
    const list = [...projects].filter((p) => p.published).sort((a, b) => a.order - b.order);
    if (activePortfolioCategory === 'All Projects') return list;
    return list.filter((p) => p.category === activePortfolioCategory);
  }, [projects, activePortfolioCategory]);

  const publishedInvitations = useMemo(
    () => invitationTemplates.filter((inv) => inv.published),
    [invitationTemplates]
  );

  const publishedFaqs = useMemo(() => faqs.filter((f) => f.published), [faqs]);

  const activeInvitationTemplate = useMemo(
    () =>
      invitationTemplates.find((inv) => inv.id === activeInvitationId) || invitationTemplates[0],
    [invitationTemplates, activeInvitationId]
  );

  // Helper to scroll smoothly to a section on the public page
  const navigateToSection = (sectionId, preselectService = null) => {
    setMobileMenuOpen(false);
    if (preselectService) {
      setInquiryForm((prev) => ({ ...prev, serviceType: preselectService }));
    }
    if (currentRoute !== 'public') {
      setCurrentRoute('public');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Open Interactive Invitation Demo
  const openInvitationPreview = (templateId) => {
    setActiveInvitationId(templateId);
    setIsInvitationOpened(false);
    setRsvpNotice('');
    setCurrentRoute('invitation-demo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Validate & Submit Project Inquiry Form
  const handleInquirySubmit = (e) => {
    e.preventDefault();
    // Anti-spam check
    if (inquiryForm.honeypot) {
      return;
    }

    const errors = {};
    if (!inquiryForm.name.trim() || inquiryForm.name.trim().length < 2) {
      errors.name = 'Nama wajib diisi (minimal 2 karakter).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inquiryForm.email.trim() || !emailRegex.test(inquiryForm.email.trim())) {
      errors.email = 'Masukkan alamat email yang valid.';
    }
    if (!inquiryForm.message.trim() || inquiryForm.message.trim().length < 15) {
      errors.message = 'Jelaskan kebutuhan proyek Anda minimal 15 karakter.';
    }

    if (Object.keys(errors).length > 0) {
      setInquiryErrors(errors);
      return;
    }

    setInquiryErrors({});
    setInquiryStatus('submitting');

    setTimeout(() => {
      const newEntry = {
        id: `inq-${Date.now()}`,
        name: inquiryForm.name.trim(),
        email: inquiryForm.email.trim(),
        whatsapp: inquiryForm.whatsapp.trim() || '-',
        company: inquiryForm.company.trim() || '-',
        serviceType: inquiryForm.serviceType,
        budgetRange: inquiryForm.budgetRange || 'Belum ditentukan',
        targetTimeline: inquiryForm.targetTimeline || 'Fleksibel',
        message: inquiryForm.message.trim(),
        status: 'new',
        createdAt: new Date().toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }),
        isSystemSample: false
      };

      setInquiries((prev) => [newEntry, ...prev]);
      setLastSubmittedInquiry(newEntry);
      setInquiryStatus('success');
      setInquiryForm({
        name: '',
        email: '',
        whatsapp: '',
        company: '',
        serviceType: 'Website Development',
        budgetRange: '',
        targetTimeline: '',
        message: '',
        honeypot: ''
      });
    }, 700);
  };

  // Handle RSVP Submission in Digital Invitation Demo
  const handleRsvpSubmit = (e) => {
    e.preventDefault();
    if (!rsvpForm.name.trim() || !rsvpForm.message.trim()) {
      setRsvpNotice('Mohon lengkapi nama dan ucapan Anda terlebih dahulu.');
      return;
    }
    const entry = {
      id: `wish-${Date.now()}`,
      name: rsvpForm.name.trim(),
      attendance: rsvpForm.attendance,
      guests: rsvpForm.guests,
      message: rsvpForm.message.trim(),
      time: 'Baru saja (Demo Session)'
    };
    setRsvpEntries((prev) => ({
      ...prev,
      [activeInvitationTemplate.id]: [entry, ...(prev[activeInvitationTemplate.id] || [])]
    }));
    setRsvpForm({ name: '', attendance: 'Hadir', guests: '1', message: '' });
    setRsvpNotice('Terima kasih! Konfirmasi kehadiran & ucapan simulasi Anda telah ditampilkan.');
  };

  // Copy SQL Schema helper
  const handleCopySql = () => {
    const textarea = document.createElement('textarea');
    textarea.value = POSTGRES_SCHEMA_SQL;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // ============================================================================
  // 4. VIEW RENDERERS: DIGITAL INVITATION INTERACTIVE DEMO
  // ============================================================================

  if (currentRoute === 'invitation-demo' && activeInvitationTemplate) {
    const theme = activeInvitationTemplate.colorScheme;
    const wishes = rsvpEntries[activeInvitationTemplate.id] || [];

    // Share to WhatsApp helper
    const shareViaWhatsApp = () => {
      const text = encodeURIComponent(
        `Undangan Digital Resmi (Konsep Demo KudoStack):\n*${activeInvitationTemplate.coupleOrHost}*\n${activeInvitationTemplate.eventTitle}\n📅 ${activeInvitationTemplate.eventDateDisplay}\n📍 ${activeInvitationTemplate.venueName}\n\nKepada Yth. ${guestNameParam}, silakan buka undangan melalui platform KudoStack.`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    };

    return (
      <div
        className="min-h-screen text-slate-100 flex flex-col selection:bg-violet-500 selection:text-white"
        style={{ backgroundColor: theme.bg }}
      >
        {/* Top Demo Control Bar */}
        <div className="sticky top-0 z-50 bg-[#080B14]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentRoute('public')}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all"
              >
                ← Kembali ke KudoStack
              </button>
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                <Sparkles className="w-3.5 h-3.5" /> Interactive Invitation Engine (DEMO)
              </span>
            </div>

            {/* Theme Switcher inside Preview */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
              <span className="text-xs text-slate-400 hidden sm:inline">Ganti Tema:</span>
              {publishedInvitations.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => {
                    setActiveInvitationId(inv.id);
                    setIsInvitationOpened(false);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    inv.id === activeInvitationTemplate.id
                      ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {inv.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cover Gate or Opened Invitation Content */}
        {!isInvitationOpened ? (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div
              className="w-96 h-96 rounded-full blur-3xl opacity-25 absolute -top-10 -left-10 pointer-events-none"
              style={{ backgroundColor: theme.accent }}
            />
            <div
              className="w-96 h-96 rounded-full blur-3xl opacity-20 absolute -bottom-10 -right-10 pointer-events-none"
              style={{ backgroundColor: '#8B5CF6' }}
            />

            <div
              className="max-w-lg w-full rounded-3xl p-8 sm:p-12 text-center relative z-10 shadow-2xl transition-all duration-500"
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.border}`
              }}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase mb-6 bg-white/5 border border-white/10 text-slate-300">
                {activeInvitationTemplate.badge} • {activeInvitationTemplate.styleCategory}
              </div>

              <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-3">
                {activeInvitationTemplate.eventTitle}
              </p>

              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 leading-tight"
                style={{ color: theme.text }}
              >
                {activeInvitationTemplate.coupleOrHost}
              </h1>

              <p className="text-sm text-slate-300 mb-8">{activeInvitationTemplate.eventDateDisplay}</p>

              {/* Customizable Guest Name Box */}
              <div className="rounded-2xl bg-black/30 border border-white/10 p-5 mb-8 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">
                    Kepada Yth. Bapak/Ibu/Saudara/i:
                  </span>
                  <span className="text-[10px] text-cyan-400">Bisa diedit (Simulasi URL)</span>
                </div>
                <input
                  type="text"
                  value={guestNameParam}
                  onChange={(e) => setGuestNameParam(e.target.value)}
                  className="w-full bg-transparent text-base sm:text-lg font-semibold text-white focus:outline-none border-b border-dashed border-white/20 pb-1"
                  aria-label="Nama Tamu Undangan"
                />
                <p className="text-[11px] text-slate-400 mt-2">
                  *Data di atas merupakan contoh demonstrasi konsep KudoStack.
                </p>
              </div>

              <button
                onClick={() => setIsInvitationOpened(true)}
                className="w-full py-4 px-6 rounded-2xl font-semibold text-sm sm:text-base text-slate-950 shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: theme.accent }}
              >
                <Mail className="w-4 h-4" /> Buka Undangan Digital
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 sm:py-14 space-y-10 animate-fadeIn">
            {/* Demo Banner Notice */}
            <div className="rounded-2xl bg-violet-500/10 border border-violet-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-violet-400 shrink-0" />
                <p className="text-xs sm:text-sm text-slate-200">
                  <strong>Mode Pratinjau Interaktif:</strong> Seluruh nama, lokasi, dan jadwal pada halaman ini adalah data simulasi untuk mendemonstrasikan fitur undangan digital <strong>KudoStack</strong>.
                </p>
              </div>
              <button
                onClick={() => {
                  setCurrentRoute('public');
                  setTimeout(() => navigateToSection('contact', 'Digital Invitations'), 120);
                }}
                className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shrink-0 transition-all"
              >
                Pesan Tema Ini
              </button>
            </div>

            {/* Hero Card */}
            <div
              className="rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.border}`
              }}
            >
              <span
                className="inline-block text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-4 bg-white/5"
                style={{ color: theme.accent }}
              >
                {activeInvitationTemplate.eventTitle}
              </span>
              <h1 className="text-3xl sm:text-5xl font-bold mb-4">{activeInvitationTemplate.coupleOrHost}</h1>
              <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base leading-relaxed mb-8">
                “{activeInvitationTemplate.storyText}”
              </p>

              {/* Countdown Simulation */}
              <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                {[
                  { label: 'Hari', val: '108' },
                  { label: 'Jam', val: '14' },
                  { label: 'Menit', val: '35' },
                  { label: 'Detik', val: '20' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl p-3 bg-black/30 border border-white/10 flex flex-col items-center"
                  >
                    <span className="text-xl sm:text-2xl font-bold" style={{ color: theme.accent }}>
                      {item.val}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Schedule & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className="rounded-3xl p-6 sm:p-8 space-y-4"
                style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.border}`
                }}
              >
                <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Clock className="w-5 h-5" style={{ color: theme.accent }} />
                </div>
                <h2 className="text-xl font-bold">Waktu Pelaksanaan</h2>
                <div className="space-y-1 text-sm text-slate-300">
                  <p className="font-semibold text-white">{activeInvitationTemplate.eventDateDisplay}</p>
                  <p>{activeInvitationTemplate.eventTimeDisplay}</p>
                </div>
                <p className="text-xs text-slate-400 pt-2">
                  Disarankan hadir 15 menit sebelum acara dimulai untuk registrasi buku tamu digital.
                </p>
              </div>

              <div
                className="rounded-3xl p-6 sm:p-8 space-y-4"
                style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.border}`
                }}
              >
                <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center">
                  <MapPin className="w-5 h-5" style={{ color: theme.accent }} />
                </div>
                <h2 className="text-xl font-bold">Lokasi Acara</h2>
                <div className="space-y-1 text-sm text-slate-300">
                  <p className="font-semibold text-white">{activeInvitationTemplate.venueName}</p>
                  <p>{activeInvitationTemplate.venueAddress}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    activeInvitationTemplate.venueName
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all"
                >
                  <MapPin className="w-3.5 h-3.5" /> Buka Penunjuk Peta
                </a>
              </div>
            </div>

            {/* Concept Visual Gallery */}
            <div
              className="rounded-3xl p-6 sm:p-8 space-y-6"
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.border}`
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Galeri Konsep Visual</h2>
                  <p className="text-xs text-slate-400">
                    Ilustrasi tata letak galeri foto (menggunakan visual abstrak konsep tanpa foto privasi orang nyata).
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300">
                  3 Frames
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {activeInvitationTemplate.galleryCaptions.map((cap, idx) => (
                  <div
                    key={idx}
                    className="group rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-black/40 p-5 flex flex-col justify-between h-48 relative"
                  >
                    <div
                      className="w-24 h-24 rounded-full blur-2xl opacity-30 absolute top-2 right-2 pointer-events-none"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className="text-[11px] font-mono text-slate-400">
                      0{idx + 1} / GALLERY DEMO
                    </span>
                    <div>
                      <Heart className="w-5 h-5 mb-2 opacity-75" style={{ color: theme.accent }} />
                      <p className="text-xs font-medium text-slate-200">{cap}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RSVP & Guestbook Interactive Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleRsvpSubmit}
                className="lg:col-span-6 rounded-3xl p-6 sm:p-8 space-y-4"
                style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.border}`
                }}
              >
                <h2 className="text-xl font-bold">Konfirmasi Kehadiran (RSVP) & Buku Tamu</h2>
                <p className="text-xs text-slate-400">
                  Coba kirimkan ucapan simulasi di bawah ini untuk menguji interaksi langsung.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nama Anda
                  </label>
                  <input
                    type="text"
                    required
                    value={rsvpForm.name}
                    onChange={(e) => setRsvpForm({ ...rsvpForm, name: e.target.value })}
                    placeholder="Contoh: Raka Pratama"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/15 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Status Kehadiran
                    </label>
                    <select
                      value={rsvpForm.attendance}
                      onChange={(e) => setRsvpForm({ ...rsvpForm, attendance: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/15 text-sm text-white focus:outline-none"
                    >
                      <option value="Hadir" className="bg-slate-900">
                        Hadir
                      </option>
                      <option value="Belum Pasti" className="bg-slate-900">
                        Belum Pasti
                      </option>
                      <option value="Berhalangan" className="bg-slate-900">
                        Berhalangan
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Jumlah Tamu
                    </label>
                    <select
                      value={rsvpForm.guests}
                      onChange={(e) => setRsvpForm({ ...rsvpForm, guests: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/15 text-sm text-white focus:outline-none"
                    >
                      <option value="1" className="bg-slate-900">
                        1 Orang
                      </option>
                      <option value="2" className="bg-slate-900">
                        2 Orang
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Ucapan & Doa
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rsvpForm.message}
                    onChange={(e) => setRsvpForm({ ...rsvpForm, message: e.target.value })}
                    placeholder="Tuliskan ucapan selamat atau pesan untuk penyelenggara..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/15 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {rsvpNotice && (
                  <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                    {rsvpNotice}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-5 rounded-xl font-semibold text-sm text-slate-950 transition-all cursor-pointer"
                    style={{ backgroundColor: theme.accent }}
                  >
                    Kirim Konfirmasi RSVP
                  </button>
                  <button
                    type="button"
                    onClick={shareViaWhatsApp}
                    className="py-3 px-4 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" /> Bagikan via WhatsApp
                  </button>
                </div>
              </form>

              {/* Wishes Feed */}
              <div
                className="lg:col-span-6 rounded-3xl p-6 sm:p-8 flex flex-col justify-between"
                style={{
                  backgroundColor: theme.card,
                  border: `1px solid ${theme.border}`
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Daftar Ucapan & Kehadiran</h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300">
                      {wishes.length} Entri
                    </span>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {wishes.map((w) => (
                      <div
                        key={w.id}
                        className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-white">{w.name}</span>
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.08)',
                              color: theme.accent
                            }}
                          >
                            {w.attendance}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{w.message}</p>
                        <p className="text-[10px] text-slate-500">{w.time}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>Crafted with KudoStack Invitation Engine</span>
                  <button
                    onClick={() => setIsInvitationOpened(false)}
                    className="text-slate-300 hover:text-white underline"
                  >
                    Lihat Ulang Cover
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 5. VIEW RENDERERS: ADMIN DASHBOARD & CMS (/admin)
  // ============================================================================

  if (currentRoute === 'admin') {
    const handleAdminLogin = (e) => {
      e.preventDefault();
      // Passcode verifikasi sesi untuk lingkungan terpadu
      if (adminPasscodeInput.trim() === 'kudostack-admin' || adminPasscodeInput.trim() === 'admin123') {
        setIsAdminAuthenticated(true);
        setAdminLoginError('');
        setAdminPasscodeInput('');
      } else {
        setAdminLoginError('Kode otorisasi tidak sesuai. Gunakan kode demo: kudostack-admin');
      }
    };

    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-[#080B14] text-[#F8FAFC] flex flex-col justify-center items-center p-4 relative overflow-hidden">
          <div className="w-96 h-96 bg-violet-600/15 rounded-full blur-3xl absolute -top-20 -left-20 pointer-events-none" />
          <div className="w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl absolute -bottom-20 -right-20 pointer-events-none" />

          <div className="max-w-md w-full bg-[#101625] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
            <div className="flex items-center justify-between mb-6">
              <KudoStackLogo brandName={siteSettings.brandName} size="sm" />
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 font-mono">
                /admin
              </span>
            </div>

            <h1 className="text-2xl font-bold mb-2">Admin Authorization Gate</h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mb-6 leading-relaxed">
              Seluruh operasi mutasi konten (Portofolio, Layanan, Undangan Digital, dan Pengaturan) dilindungi oleh gerbang otorisasi admin.
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Admin Access Key
                </label>
                <input
                  type="password"
                  required
                  value={adminPasscodeInput}
                  onChange={(e) => setAdminPasscodeInput(e.target.value)}
                  placeholder="Masukkan kode akses..."
                  className="w-full px-4 py-3 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Kode akses pratinjau: <code className="text-cyan-400 font-mono">kudostack-admin</code></span>
                  <button
                    type="button"
                    onClick={() => setAdminPasscodeInput('kudostack-admin')}
                    className="text-violet-400 hover:underline"
                  >
                    Isi Otomatis
                  </button>
                </div>
              </div>

              {adminLoginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  {adminLoginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" /> Masuk ke Dashboard CMS
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
              <span>Clerk / Server-Auth Ready</span>
              <button
                onClick={() => setCurrentRoute('public')}
                className="text-slate-300 hover:text-white"
              >
                ← Kembali ke Website Publik
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Authenticated Admin CMS View
    const adminTabs = [
      { id: 'overview', label: 'Overview', icon: <Sliders className="w-4 h-4" /> },
      { id: 'portfolio', label: 'Portfolio', icon: <FolderKanban className="w-4 h-4" />, count: projects.length },
      { id: 'services', label: 'Services', icon: <Briefcase className="w-4 h-4" />, count: services.length },
      { id: 'invitations', label: 'Invitations', icon: <CalendarHeart className="w-4 h-4" />, count: invitationTemplates.length },
      { id: 'inquiries', label: 'Inquiries', icon: <Inbox className="w-4 h-4" />, count: inquiries.length },
      { id: 'content', label: 'Content & FAQ', icon: <HelpCircle className="w-4 h-4" /> },
      { id: 'settings', label: 'Settings & DB', icon: <Database className="w-4 h-4" /> }
    ];

    return (
      <div className="min-h-screen bg-[#080B14] text-[#F8FAFC] flex flex-col">
        {/* Top Admin Header */}
        <header className="sticky top-0 z-40 bg-[#101625]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <KudoStackLogo brandName={siteSettings.brandName} size="sm" />
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                CMS Active
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentRoute('public')}
                className="text-xs sm:text-sm px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-cyan-400" /> Lihat Website Publik
              </button>
              <button
                onClick={() => setIsAdminAuthenticated(false)}
                className="text-xs sm:text-sm px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4" /> Keluar
              </button>
            </div>
          </div>
        </header>

        {/* Admin Toast Notification */}
        {adminToast && (
          <div className="fixed bottom-5 right-5 z-50 bg-[#101625] border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{adminToast.message}</span>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#101625] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Konfirmasi Penghapusan Data</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus <strong>“{deleteConfirmModal.title}”</strong>? Tindakan ini akan langsung memperbarui tampilan halaman publik.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    deleteConfirmModal.onConfirm();
                    setDeleteConfirmModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
                >
                  Ya, Hapus Permanen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main CMS Body */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 space-y-2">
            <div className="p-3 rounded-2xl bg-[#101625] border border-white/10 space-y-1">
              {adminTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    activeAdminTab === tab.id
                      ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {tab.icon}
                    {tab.label}
                  </span>
                  {typeof tab.count === 'number' && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/30 text-slate-200">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-[#101625]/60 border border-white/5 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" /> Status Integritas Data
              </p>
              <p className="leading-relaxed">
                Seluruh angka di ringkasan dihitung langsung dari state database aktual (bukan angka statis/dummy). Perubahan di sini langsung tercermin di halaman utama.
              </p>
            </div>
          </aside>

          {/* CMS Content Area */}
          <main className="lg:col-span-9 space-y-6">
            {/* TAB 1: OVERVIEW */}
            {activeAdminTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold">Dashboard Overview</h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Statistik aktual berdasarkan entitas yang tersimpan pada sistem KudoStack saat ini.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-[#101625] border border-white/10">
                    <span className="text-xs text-slate-400">Proyek Portofolio</span>
                    <div className="text-3xl font-bold mt-2 text-white">
                      {projects.filter((p) => p.published).length}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        / {projects.length} total
                      </span>
                    </div>
                    <p className="text-[11px] text-cyan-400 mt-2">
                      {projects.filter((p) => p.isConcept).length} ditandai sebagai Konsep/Demo
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#101625] border border-white/10">
                    <span className="text-xs text-slate-400">Layanan Aktif</span>
                    <div className="text-3xl font-bold mt-2 text-white">
                      {services.filter((s) => s.published).length}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        / {services.length} total
                      </span>
                    </div>
                    <p className="text-[11px] text-violet-400 mt-2">Ditampilkan di halaman utama</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#101625] border border-white/10">
                    <span className="text-xs text-slate-400">Tema Undangan Digital</span>
                    <div className="text-3xl font-bold mt-2 text-white">
                      {invitationTemplates.filter((i) => i.published).length}
                    </div>
                    <p className="text-[11px] text-emerald-400 mt-2">Siap didemokan secara interaktif</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#101625] border border-white/10">
                    <span className="text-xs text-slate-400">Project Inquiries Masuk</span>
                    <div className="text-3xl font-bold mt-2 text-white">{inquiries.length}</div>
                    <p className="text-[11px] text-amber-400 mt-2">
                      {inquiries.filter((i) => i.status === 'new').length} belum ditindaklanjuti
                    </p>
                  </div>
                </div>

                {/* Quick Actions & Honest Status */}
                <div className="rounded-3xl bg-[#101625] border border-white/10 p-6 space-y-4">
                  <h2 className="text-lg font-bold">Status Konfigurasi Produksi & Kejujuran Data</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="p-4 rounded-2xl bg-[#080B14] border border-white/10 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">Pelabelan Proyek Demo & Konsep</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Seluruh proyek contoh saat ini memiliki badge <code>CONCEPT DEMO</code> agar tidak menyesatkan calon pelanggan.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#080B14] border border-white/10 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">Nomor WhatsApp Bisnis</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {siteSettings.whatsappNumber
                            ? `Terkonfigurasi: ${siteSettings.whatsappNumber}`
                            : 'Belum dikonfigurasi (kosong secara jujur tanpa nomor palsu). Atur pada tab Settings.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PORTFOLIO MANAGEMENT */}
            {activeAdminTab === 'portfolio' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">Portfolio Management</h1>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Tambah, edit, ubah status publikasi, atau atur label Demo/Karya Nyata pada setiap proyek.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEditingProject({
                        id: null,
                        title: '',
                        category: 'Websites',
                        isConcept: true,
                        badgeLabel: 'CONCEPT DEMO',
                        summary: '',
                        challenge: '',
                        solution: '',
                        techStackText: 'Next.js, Tailwind CSS, TypeScript',
                        published: true,
                        order: projects.length + 1
                      })
                    }
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tambah Proyek Baru
                  </button>
                </div>

                {/* Add / Edit Project Form */}
                {editingProject && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const techArray = (editingProject.techStackText || '')
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean);

                      if (editingProject.id) {
                        setProjects((prev) =>
                          prev.map((p) =>
                            p.id === editingProject.id
                              ? {
                                  ...p,
                                  ...editingProject,
                                  techStack: techArray,
                                  badgeLabel: editingProject.isConcept ? 'CONCEPT DEMO' : 'CLIENT PROJECT'
                                }
                              : p
                          )
                        );
                        triggerAdminToast('Proyek portofolio berhasil diperbarui.');
                      } else {
                        const newProj = {
                          ...editingProject,
                          id: `prj-${Date.now()}`,
                          slug: editingProject.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                          techStack: techArray,
                          badgeLabel: editingProject.isConcept ? 'CONCEPT DEMO' : 'CLIENT PROJECT',
                          previewTheme: 'from-violet-600/30 via-indigo-600/20 to-cyan-500/20',
                          accentColor: '#8B5CF6'
                        };
                        setProjects((prev) => [...prev, newProj]);
                        triggerAdminToast('Proyek portofolio baru berhasil ditambahkan.');
                      }
                      setEditingProject(null);
                    }}
                    className="p-6 rounded-3xl bg-[#101625] border border-violet-500/40 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold">
                        {editingProject.id ? 'Edit Proyek Portofolio' : 'Tambah Proyek Portofolio'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditingProject(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Tutup Form
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Nama Proyek *</label>
                        <input
                          type="text"
                          required
                          value={editingProject.title}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, title: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Kategori *</label>
                        <select
                          value={editingProject.category}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, category: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                        >
                          <option value="Websites">Websites</option>
                          <option value="Digital Invitations">Digital Invitations</option>
                          <option value="UI/UX">UI/UX</option>
                          <option value="Web Applications">Web Applications</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Deskripsi Singkat *</label>
                      <textarea
                        rows={2}
                        required
                        value={editingProject.summary}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, summary: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">
                          Teknologi (pisahkan dengan koma)
                        </label>
                        <input
                          type="text"
                          value={editingProject.techStackText}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, techStackText: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                        />
                      </div>
                      <div className="flex items-center gap-6 pt-5">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingProject.isConcept}
                            onChange={(e) =>
                              setEditingProject({ ...editingProject, isConcept: e.target.checked })
                            }
                            className="rounded border-white/20"
                          />
                          Tandai sebagai Konsep / Demo
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingProject.published}
                            onChange={(e) =>
                              setEditingProject({ ...editingProject, published: e.target.checked })
                            }
                            className="rounded border-white/20"
                          />
                          Publish ke Publik
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingProject(null)}
                        className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> Simpan Proyek
                      </button>
                    </div>
                  </form>
                )}

                {/* Project List Table */}
                <div className="space-y-3">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#101625] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm sm:text-base">
                            {proj.title}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/5 text-cyan-300 border border-white/10">
                            {proj.category}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              proj.isConcept
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {proj.badgeLabel}
                          </span>
                          {!proj.published && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                              Draft (Hidden)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{proj.summary}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setProjects((prev) =>
                              prev.map((p) =>
                                p.id === proj.id ? { ...p, published: !p.published } : p
                              )
                            );
                            triggerAdminToast(
                              `Status publikasi "${proj.title}" diubah.`
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                        >
                          {proj.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() =>
                            setEditingProject({
                              ...proj,
                              techStackText: (proj.techStack || []).join(', ')
                            })
                          }
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirmModal({
                              title: proj.title,
                              onConfirm: () => {
                                setProjects((prev) => prev.filter((p) => p.id !== proj.id));
                                triggerAdminToast('Proyek berhasil dihapus.');
                              }
                            })
                          }
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SERVICES MANAGEMENT */}
            {activeAdminTab === 'services' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">Services Management</h1>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Kelola daftar layanan digital KudoStack yang ditampilkan kepada calon klien.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEditingService({
                        id: null,
                        title: '',
                        iconName: 'Layers',
                        description: '',
                        deliverablesText: 'Custom Architecture, Responsive UI, Documentation',
                        published: true,
                        order: services.length + 1
                      })
                    }
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Tambah Layanan
                  </button>
                </div>

                {editingService && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const deliv = (editingService.deliverablesText || '')
                        .split(',')
                        .map((d) => d.trim())
                        .filter(Boolean);
                      if (editingService.id) {
                        setServices((prev) =>
                          prev.map((s) =>
                            s.id === editingService.id
                              ? { ...s, ...editingService, deliverables: deliv }
                              : s
                          )
                        );
                        triggerAdminToast('Layanan berhasil diperbarui.');
                      } else {
                        setServices((prev) => [
                          ...prev,
                          {
                            ...editingService,
                            id: `srv-${Date.now()}`,
                            slug: editingService.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                            deliverables: deliv
                          }
                        ]);
                        triggerAdminToast('Layanan baru berhasil ditambahkan.');
                      }
                      setEditingService(null);
                    }}
                    className="p-6 rounded-3xl bg-[#101625] border border-violet-500/40 space-y-4"
                  >
                    <h3 className="text-base font-bold">
                      {editingService.id ? 'Edit Layanan' : 'Tambah Layanan Baru'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Judul Layanan *</label>
                        <input
                          type="text"
                          required
                          value={editingService.title}
                          onChange={(e) =>
                            setEditingService({ ...editingService, title: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Ikon Lucide</label>
                        <select
                          value={editingService.iconName}
                          onChange={(e) =>
                            setEditingService({ ...editingService, iconName: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                        >
                          <option value="Code2">Code2 (Web Dev)</option>
                          <option value="CalendarHeart">CalendarHeart (Invitations)</option>
                          <option value="Layout">Layout (Landing Page)</option>
                          <option value="Building2">Building2 (Company Profile)</option>
                          <option value="Palette">Palette (UI/UX)</option>
                          <option value="Cpu">Cpu (Web Apps)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Deskripsi *</label>
                      <textarea
                        rows={2}
                        required
                        value={editingService.description}
                        onChange={(e) =>
                          setEditingService({ ...editingService, description: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingService(null)}
                        className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
                      >
                        Simpan Layanan
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-5 rounded-2xl bg-[#101625] border border-white/10 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center">
                              <ServiceIcon name={srv.iconName} className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-white text-sm sm:text-base">{srv.title}</h3>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              srv.published
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-rose-500/15 text-rose-300'
                            }`}
                          >
                            {srv.published ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{srv.description}</p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() =>
                            setServices((prev) =>
                              prev.map((s) =>
                                s.id === srv.id ? { ...s, published: !s.published } : s
                              )
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                        >
                          {srv.published ? 'Sembunyikan' : 'Tampilkan'}
                        </button>
                        <button
                          onClick={() =>
                            setEditingService({
                              ...srv,
                              deliverablesText: (srv.deliverables || []).join(', ')
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-cyan-300"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: DIGITAL INVITATIONS MANAGEMENT */}
            {activeAdminTab === 'invitations' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold">Digital Invitations Theme Manager</h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Kelola tema undangan digital dan detail simulasi acara yang dapat dibuka pada Interactive Preview.
                  </p>
                </div>

                {editingInvitation && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setInvitationTemplates((prev) =>
                        prev.map((inv) =>
                          inv.id === editingInvitation.id ? editingInvitation : inv
                        )
                      );
                      setEditingInvitation(null);
                      triggerAdminToast('Tema undangan digital berhasil diperbarui.');
                    }}
                    className="p-6 rounded-3xl bg-[#101625] border border-cyan-500/40 space-y-4"
                  >
                    <h3 className="text-base font-bold">Edit Tema: {editingInvitation.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Nama Tema</label>
                        <input
                          type="text"
                          required
                          value={editingInvitation.name}
                          onChange={(e) =>
                            setEditingInvitation({ ...editingInvitation, name: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">
                          Nama Pasangan / Penyelenggara Demo
                        </label>
                        <input
                          type="text"
                          required
                          value={editingInvitation.coupleOrHost}
                          onChange={(e) =>
                            setEditingInvitation({
                              ...editingInvitation,
                              coupleOrHost: e.target.value
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Tanggal Tampil</label>
                        <input
                          type="text"
                          value={editingInvitation.eventDateDisplay}
                          onChange={(e) =>
                            setEditingInvitation({
                              ...editingInvitation,
                              eventDateDisplay: e.target.value
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Nama Venue Simulasi</label>
                        <input
                          type="text"
                          value={editingInvitation.venueName}
                          onChange={(e) =>
                            setEditingInvitation({
                              ...editingInvitation,
                              venueName: e.target.value
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingInvitation(null)}
                        className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white"
                      >
                        Simpan Perubahan Tema
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invitationTemplates.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-5 rounded-2xl bg-[#101625] border border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-cyan-300">
                          {inv.styleCategory}
                        </span>
                        <span className="text-[11px] text-slate-400">{inv.badge}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{inv.name}</h3>
                      <p className="text-xs text-slate-300">
                        Host/Couple: <strong>{inv.coupleOrHost}</strong>
                      </p>
                      <p className="text-xs text-slate-400">
                        {inv.eventDateDisplay} • {inv.venueName}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <button
                          onClick={() => openInvitationPreview(inv.id)}
                          className="text-xs text-violet-400 hover:text-violet-300 font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Buka Live Demo
                        </button>
                        <button
                          onClick={() => setEditingInvitation(inv)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-200"
                        >
                          Edit Konten Demo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: INQUIRY MANAGEMENT */}
            {activeAdminTab === 'inquiries' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold">Client Inquiry Management</h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Daftar permintaan proyek yang dikirim melalui formulir kontak di halaman utama.
                  </p>
                </div>

                {inquiries.length === 0 ? (
                  <div className="p-12 rounded-3xl bg-[#101625] border border-white/10 text-center space-y-2">
                    <Inbox className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">Belum Ada Inquiry Masuk</p>
                    <p className="text-xs text-slate-500">
                      Permintaan proyek baru dari calon klien akan muncul secara otomatis di halaman ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="p-5 sm:p-6 rounded-3xl bg-[#101625] border border-white/10 space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-base text-white">{inq.name}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                              {inq.serviceType}
                            </span>
                            {inq.isSystemSample && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                                Sample Data
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{inq.createdAt}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#080B14] p-3.5 rounded-2xl border border-white/5">
                          <div>
                            <span className="text-slate-500 block">Email / WhatsApp:</span>
                            <span className="text-slate-200 font-medium">
                              {inq.email} ({inq.whatsapp})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Brand / Perusahaan:</span>
                            <span className="text-slate-200 font-medium">{inq.company}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Estimasi Anggaran & Target:</span>
                            <span className="text-slate-200 font-medium">
                              {inq.budgetRange} • {inq.targetTimeline}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                          “{inq.message}”
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Status:</span>
                            {['new', 'reviewed', 'followed_up'].map((st) => (
                              <button
                                key={st}
                                onClick={() => {
                                  setInquiries((prev) =>
                                    prev.map((item) =>
                                      item.id === inq.id ? { ...item, status: st } : item
                                    )
                                  );
                                  triggerAdminToast(`Status inquiry diperbarui ke "${st}".`);
                                }}
                                className={`text-[11px] px-2.5 py-1 rounded-lg capitalize transition-all ${
                                  inq.status === st
                                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                              >
                                {st.replace('_', ' ')}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() =>
                              setDeleteConfirmModal({
                                title: `Inquiry dari ${inq.name}`,
                                onConfirm: () => {
                                  setInquiries((prev) => prev.filter((i) => i.id !== inq.id));
                                  triggerAdminToast('Data inquiry berhasil dihapus.');
                                }
                              })
                            }
                            className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus Inquiry
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: CONTENT, FAQ & TESTIMONIALS */}
            {activeAdminTab === 'content' && (
              <div className="space-y-8">
                {/* Headline & Copy Editor */}
                <div className="p-6 rounded-3xl bg-[#101625] border border-white/10 space-y-4">
                  <h2 className="text-lg font-bold">Hero & About Copywriting</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Hero Headline</label>
                      <input
                        type="text"
                        value={siteSettings.heroHeadline}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, heroHeadline: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Hero Subheadline</label>
                      <textarea
                        rows={2}
                        value={siteSettings.heroSubheadline}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, heroSubheadline: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">About Description</label>
                      <textarea
                        rows={3}
                        value={siteSettings.aboutDescription}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, aboutDescription: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => triggerAdminToast('Konten teks utama berhasil disimpan.')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                  >
                    Terapkan Perubahan Teks
                  </button>
                </div>

                {/* FAQ Management */}
                <div className="p-6 rounded-3xl bg-[#101625] border border-white/10 space-y-4">
                  <h2 className="text-lg font-bold">FAQ Management ({faqs.length})</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newFaqForm.question.trim() || !newFaqForm.answer.trim()) return;
                      setFaqs((prev) => [
                        ...prev,
                        {
                          id: `faq-${Date.now()}`,
                          question: newFaqForm.question.trim(),
                          answer: newFaqForm.answer.trim(),
                          published: true
                        }
                      ]);
                      setNewFaqForm({ question: '', answer: '' });
                      triggerAdminToast('Pertanyaan FAQ baru berhasil ditambahkan.');
                    }}
                    className="grid grid-cols-1 gap-3 bg-[#080B14] p-4 rounded-2xl border border-white/10"
                  >
                    <input
                      type="text"
                      placeholder="Pertanyaan baru..."
                      value={newFaqForm.question}
                      onChange={(e) => setNewFaqForm({ ...newFaqForm, question: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#101625] border border-white/10 text-xs sm:text-sm text-white"
                    />
                    <textarea
                      rows={2}
                      placeholder="Jawaban informatif dan transparan..."
                      value={newFaqForm.answer}
                      onChange={(e) => setNewFaqForm({ ...newFaqForm, answer: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#101625] border border-white/10 text-xs sm:text-sm text-white"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-violet-600 text-xs font-semibold text-white"
                      >
                        + Tambah FAQ
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {faqs.map((f) => (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-xl bg-[#080B14] border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-white">{f.question}</p>
                          <p className="text-xs text-slate-400 line-clamp-1">{f.answer}</p>
                        </div>
                        <button
                          onClick={() =>
                            setFaqs((prev) => prev.filter((item) => item.id !== f.id))
                          }
                          className="text-rose-400 hover:text-rose-300 p-1.5 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Honest Testimonials Manager */}
                <div className="p-6 rounded-3xl bg-[#101625] border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold">Testimonials Control (Zero Fake Reviews Policy)</h2>
                      <p className="text-xs text-slate-400">
                        Secara default disembunyikan di halaman publik sampai ulasan pelanggan nyata tersedia.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siteSettings.showTestimonialsSection}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            showTestimonialsSection: e.target.checked
                          })
                        }
                      />
                      Tampilkan Section Testimonial di Publik
                    </label>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newTestimonialForm.clientName.trim() || !newTestimonialForm.quote.trim())
                        return;
                      setTestimonials((prev) => [
                        ...prev,
                        {
                          id: `testi-${Date.now()}`,
                          clientName: newTestimonialForm.clientName.trim(),
                          clientRole: newTestimonialForm.clientRole.trim() || 'Client',
                          quote: newTestimonialForm.quote.trim()
                        }
                      ]);
                      setNewTestimonialForm({ clientName: '', clientRole: '', quote: '' });
                      triggerAdminToast('Testimonial nyata berhasil ditambahkan.');
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#080B14] p-4 rounded-2xl border border-white/10"
                  >
                    <input
                      type="text"
                      placeholder="Nama Klien Nyata"
                      value={newTestimonialForm.clientName}
                      onChange={(e) =>
                        setNewTestimonialForm({ ...newTestimonialForm, clientName: e.target.value })
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#101625] border border-white/10 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Perusahaan / Acara"
                      value={newTestimonialForm.clientRole}
                      onChange={(e) =>
                        setNewTestimonialForm({ ...newTestimonialForm, clientRole: e.target.value })
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#101625] border border-white/10 text-xs text-white"
                    />
                    <textarea
                      rows={2}
                      placeholder="Kutipan ulasan asli dari klien..."
                      value={newTestimonialForm.quote}
                      onChange={(e) =>
                        setNewTestimonialForm({ ...newTestimonialForm, quote: e.target.value })
                      }
                      className="sm:col-span-2 px-3.5 py-2 rounded-xl bg-[#101625] border border-white/10 text-xs text-white"
                    />
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-cyan-600 text-xs font-semibold text-white"
                      >
                        + Simpan Ulasan Klien
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 7: SETTINGS & POSTGRESQL SCHEMA */}
            {activeAdminTab === 'settings' && (
              <div className="space-y-8">
                <div className="p-6 rounded-3xl bg-[#101625] border border-white/10 space-y-4">
                  <h2 className="text-lg font-bold">Website Settings & Contact Integration</h2>
                  <p className="text-xs text-slate-400">
                    Konfigurasikan nomor WhatsApp dan email resmi KudoStack. Jika nomor WhatsApp dikosongkan, tombol WhatsApp di halaman publik akan menampilkan pemberitahuan transparan.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Nama Brand</label>
                      <input
                        type="text"
                        value={siteSettings.brandName}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, brandName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Email Bisnis Resmi</label>
                      <input
                        type="email"
                        value={siteSettings.businessEmail}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, businessEmail: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Nomor WhatsApp Bisnis (Format: 62812xxxx)
                      </label>
                      <input
                        type="text"
                        placeholder="Kosongkan jika belum ada nomor resmi"
                        value={siteSettings.whatsappNumber}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, whatsappNumber: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">SEO Title Metadata</label>
                      <input
                        type="text"
                        value={siteSettings.seoTitle}
                        onChange={(e) =>
                          setSiteSettings({ ...siteSettings, seoTitle: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      triggerAdminToast('Pengaturan website & kontak berhasil diperbarui.')
                    }
                    className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
                  >
                    Simpan Pengaturan
                  </button>
                </div>

                {/* PostgreSQL / Neon Production Migration Schema */}
                <div className="p-6 rounded-3xl bg-[#101625] border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-cyan-400" /> Production PostgreSQL (Neon) Schema
                      </h2>
                      <p className="text-xs text-slate-400">
                        Skema SQL siap pakai untuk migrasi database produksi (`projects`, `services`, `invitation_templates`, `inquiries`, `faqs`, `testimonials`, `site_settings`, `admin_roles`).
                      </p>
                    </div>
                    <button
                      onClick={handleCopySql}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" /> Tersalin!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Salin SQL Migration
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 rounded-2xl bg-[#080B14] border border-white/10 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-80 leading-relaxed">
                    {POSTGRES_SCHEMA_SQL}
                  </pre>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 6. VIEW RENDERERS: PUBLIC WEBSITE (MAIN LANDING & PORTFOLIO PLATFORM)
  // ============================================================================

  const portfolioCategories = [
    'All Projects',
    'Websites',
    'Digital Invitations',
    'UI/UX',
    'Web Applications'
  ];

  return (
    <div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPointerPos({ x, y });
      }}
      className="min-h-screen bg-[#080B14] text-[#F8FAFC] relative overflow-x-hidden selection:bg-violet-500 selection:text-white font-sans"
    >
      {/* Subtle Grid & Ambient Glow Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.16] z-0"
        style={{
          backgroundImage:
            'radial-gradient(rgba(148, 163, 184, 0.35) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />
      <div
        className="fixed w-[550px] h-[550px] rounded-full blur-[140px] opacity-20 pointer-events-none z-0 transition-all duration-700"
        style={{
          background: 'radial-gradient(circle, #8B5CF6 0%, #22D3EE 60%, transparent 100%)',
          left: `calc(${pointerPos.x}% - 275px)`,
          top: `calc(${pointerPos.y}% - 275px)`
        }}
      />

      {/* =====================================================================
          A. STICKY NAVIGATION BAR
      ===================================================================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-[#080B14]/85 backdrop-blur-xl border-b border-white/10 py-3.5 shadow-2xl shadow-black/50'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              navigateToSection('home');
            }}
            aria-label="KudoStack Home"
          >
            <KudoStackLogo brandName={siteSettings.brandName} />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 bg-white/[0.03] border border-white/10 rounded-2xl px-3 py-1.5 backdrop-blur-md">
            {[
              { label: 'Home', id: 'home' },
              { label: 'Services', id: 'services' },
              { label: 'Portfolio', id: 'portfolio' },
              { label: 'Invitations', id: 'invitations' },
              { label: 'About', id: 'about' },
              { label: 'Contact', id: 'contact' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => navigateToSection(item.id)}
                className="px-3.5 py-1.5 rounded-xl text-xs lg:text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop Right CTA & Admin Switch */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setCurrentRoute('admin')}
              className="px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-cyan-300 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
              title="Buka Dashboard Admin CMS"
            >
              /admin
            </button>
            <button
              onClick={() => navigateToSection('contact')}
              className="px-5 py-2.5 rounded-xl text-xs lg:text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 shadow-lg shadow-violet-600/25 hover:shadow-cyan-500/30 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              Start a Project <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Hamburger Trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setCurrentRoute('admin')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-white/5 border border-white/10 text-slate-300"
            >
              /admin
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#101625]/95 backdrop-blur-2xl border-b border-white/10 px-4 pt-3 pb-6 mt-3 space-y-2">
            {[
              { label: 'Home', id: 'home' },
              { label: 'Services', id: 'services' },
              { label: 'Portfolio', id: 'portfolio' },
              { label: 'Digital Invitations', id: 'invitations' },
              { label: 'About KudoStack', id: 'about' },
              { label: 'FAQ', id: 'faq' },
              { label: 'Contact', id: 'contact' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => navigateToSection(item.id)}
                className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2">
              <button
                onClick={() => navigateToSection('contact')}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 to-cyan-500 flex items-center justify-center gap-2"
              >
                Start a Project <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =====================================================================
          B. HERO SECTION
      ===================================================================== */}
      <section id="home" className="relative z-10 pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copywriting & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-medium text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>{siteSettings.tagline}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-[#F8FAFC]">
              {siteSettings.heroHeadline.split('Exceptional')[0]}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent">
                {siteSettings.heroHeadline.includes('Exceptional')
                  ? 'Exceptional Digital Experiences.'
                  : ''}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#94A3B8] max-w-2xl leading-relaxed">
              {siteSettings.heroSubheadline}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <button
                onClick={() => navigateToSection('contact')}
                className="px-7 py-4 rounded-2xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 shadow-xl shadow-violet-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
              >
                <span>Let’s Build Something</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigateToSection('portfolio')}
                className="px-7 py-4 rounded-2xl font-semibold text-sm sm:text-base text-slate-200 bg-[#101625] hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Explore Our Work</span>
                <ArrowUpRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Capabilities Pills */}
            <div className="pt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500 mr-1">Core Craft:</span>
              {[
                'Modern Web Development',
                'Interactive Digital Invitations',
                'UI/UX Architecture',
                'Custom Web Apps'
              ].map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg bg-[#101625] border border-white/5 text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Browser Mockup & Floating UI Cards */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Glow Behind Mockup */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-violet-600/25 via-transparent to-cyan-400/25 rounded-3xl blur-2xl pointer-events-none" />

              {/* Main Browser Window Card */}
              <div className="relative rounded-3xl bg-[#101625]/90 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-xl">
                {/* Browser Top Bar */}
                <div className="px-4 py-3 bg-[#080B14]/80 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-cyan-400" /> kudostack.studio/craft
                  </div>
                  <span className="text-[10px] font-mono text-violet-400">v2.5</span>
                </div>

                {/* Browser Inner Interactive Canvas */}
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
                        Unified Digital Studio
                      </span>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        Architecture Meets Aesthetics
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300">
                      <Code2 className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Mini Interactive Cards Inside Mockup */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => navigateToSection('portfolio')}
                      className="p-4 rounded-2xl bg-[#080B14]/90 border border-white/10 hover:border-violet-500/50 transition-all cursor-pointer group"
                    >
                      <Layout className="w-5 h-5 text-violet-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold text-white">Web Platforms</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Landing Pages & SaaS UI
                      </p>
                    </div>

                    <div
                      onClick={() => openInvitationPreview('inv-1')}
                      className="p-4 rounded-2xl bg-[#080B14]/90 border border-white/10 hover:border-cyan-400/50 transition-all cursor-pointer group"
                    >
                      <CalendarHeart className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold text-white">Digital Invitations</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Klik untuk Live Demo →
                      </p>
                    </div>
                  </div>

                  {/* Live System Status Bar */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/50 via-[#080B14] to-cyan-950/40 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs text-slate-200 font-medium">
                        Responsive & High-Contrast UI System
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-cyan-300">
                      READY
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="max-w-7xl mx-auto mt-16 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
          <span>Scroll untuk menjelajahi solusi KudoStack</span>
          <button
            onClick={() => navigateToSection('services')}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <span>Explore Services</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      </section>

      {/* =====================================================================
          C. TRUSTED DIGITAL SOLUTIONS (VALUE PILLARS — NO FAKE STATS)
      ===================================================================== */}
      <section className="relative z-10 py-14 px-4 sm:px-6 lg:px-8 bg-[#101625]/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="max-w-3xl">
            <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
              Our Value Commitment
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2 text-white">
              Dirancang untuk Fungsionalitas Nyata, Estetika Modern, dan Kemudahan Penggunaan.
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] mt-2 leading-relaxed">
              Kami mengutamakan kualitas rekayasa perangkat lunak dan kejelasan komunikasi visual agar setiap platform digital yang dibangun relevan bagi audiens Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Layers className="w-5 h-5 text-violet-400" />,
                title: 'Tailored Architecture',
                desc: 'Setiap proyek disusun berdasarkan struktur informasi dan karakter unik brand Anda, bukan sekadar menyalin template generik.'
              },
              {
                icon: <Smartphone className="w-5 h-5 text-cyan-400" />,
                title: 'Seamless Multi-Device UX',
                desc: 'Tata letak adaptif yang nyaman dioperasikan baik pada layar smartphone kompak maupun monitor desktop resolusi tinggi.'
              },
              {
                icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
                title: 'Maintainable & Scalable Code',
                desc: 'Dibangun dengan fondasi teknologi modern yang mudah diperbarui, dikelola melalui CMS, dan siap berkembang seiring bisnis Anda.'
              }
            ].map((pillar, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#080B14]/80 border border-white/10 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  {pillar.icon}
                </div>
                <h3 className="text-base font-bold text-white">{pillar.title}</h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          D. SERVICES SECTION
      ===================================================================== */}
      <section id="services" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                01 / Digital Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Layanan Solusi Digital Terpadu
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8]">
                Mulai dari halaman arahan bisnis, undangan digital interaktif, hingga pengembangan sistem web kustom sesuai kebutuhan proyek.
              </p>
            </div>
            <button
              onClick={() => navigateToSection('contact')}
              className="self-start md:self-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-medium text-slate-200 inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              Konsultasikan Kebutuhan <ArrowRight className="w-4 h-4 text-violet-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedServices.map((srv) => (
              <div
                key={srv.id}
                className="group rounded-3xl bg-[#101625] border border-white/10 hover:border-violet-500/40 p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-violet-950/25"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/15 border border-white/10 flex items-center justify-center text-violet-300 group-hover:text-cyan-300 transition-colors">
                    <ServiceIcon name={srv.iconName} className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {srv.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                    {srv.description}
                  </p>

                  {srv.deliverables && srv.deliverables.length > 0 && (
                    <ul className="pt-2 space-y-1.5">
                      {srv.deliverables.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-300 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => navigateToSection('contact', srv.title)}
                    className="text-xs font-semibold text-violet-400 group-hover:text-cyan-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Diskusikan Layanan Ini</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          E. PORTFOLIO SHOWCASE (BENTO / EDITORIAL GRID + MODAL DETAIL)
      ===================================================================== */}
      <section
        id="portfolio"
        className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-[#101625]/40 border-y border-white/5"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
                02 / Selected Works & Concepts
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Portfolio & Eksplorasi Desain
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8]">
                Setiap proyek konsep dan demonstrasi teknis di bawah ini diberi label secara transparan untuk menunjukkan standar desain dan kapabilitas rekayasa KudoStack.
              </p>
            </div>

            {/* Working Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
              {portfolioCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActivePortfolioCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activePortfolioCategory === cat
                      ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-600/20'
                      : 'bg-[#080B14] text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Editorial Asymmetric Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {publishedProjects.map((project, index) => {
              const isFeaturedWide = index === 0 && activePortfolioCategory === 'All Projects';
              return (
                <div
                  key={project.id}
                  className={`${
                    isFeaturedWide ? 'md:col-span-7' : index === 1 && activePortfolioCategory === 'All Projects' ? 'md:col-span-5' : 'md:col-span-4'
                  } group rounded-3xl bg-[#101625] border border-white/10 hover:border-cyan-400/40 overflow-hidden flex flex-col justify-between transition-all duration-300`}
                >
                  {/* Visual Mockup Header */}
                  <div
                    className={`p-6 sm:p-8 bg-gradient-to-br ${
                      project.previewTheme || 'from-violet-600/20 to-cyan-500/20'
                    } border-b border-white/10 relative overflow-hidden min-h-[190px] flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between gap-2 relative z-10">
                      <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-[#080B14]/80 text-slate-200 border border-white/10">
                        {project.category}
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {project.badgeLabel}
                      </span>
                    </div>

                    {/* Simulated UI Wireframe inside Card */}
                    <div className="mt-6 p-4 rounded-2xl bg-[#080B14]/85 border border-white/10 backdrop-blur-md relative z-10 group-hover:scale-[1.02] transition-transform">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-violet-400" />
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {project.slug}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white truncate">{project.title}</p>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                        {project.summary}
                      </p>
                    </div>

                    <div className="space-y-4 pt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(project.techStack || []).map((tech, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2.5 py-0.5 rounded-lg bg-[#080B14] text-slate-300 border border-white/5"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedProjectModal(project)}
                          className="text-xs font-semibold text-white hover:text-cyan-300 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>View Project Details</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </button>

                        {project.linkedInvitationId && (
                          <button
                            onClick={() => openInvitationPreview(project.linkedInvitationId)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 cursor-pointer"
                          >
                            Live Invitation Demo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Case Study Modal */}
        {selectedProjectModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedProjectModal(null)}
          >
            <div
              className="max-w-2xl w-full bg-[#101625] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                      {selectedProjectModal.category}
                    </span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                      {selectedProjectModal.badgeLabel}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white pt-1">
                    {selectedProjectModal.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedProjectModal(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                {selectedProjectModal.summary}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#080B14] border border-white/10 space-y-1.5">
                  <span className="text-xs font-mono uppercase text-violet-400">
                    Tantangan Desain
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedProjectModal.challenge ||
                      'Merancang antarmuka yang menyeimbangkan identitas visual modern dengan kecepatan akses di berbagai perangkat.'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#080B14] border border-white/10 space-y-1.5">
                  <span className="text-xs font-mono uppercase text-cyan-400">
                    Solusi KudoStack
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedProjectModal.solution ||
                      'Mengimplementasikan arsitektur komponen modular, hierarki tipografi yang jelas, dan optimasi performa rendering.'}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-2">Teknologi & Spesifikasi:</span>
                <div className="flex flex-wrap gap-2">
                  {(selectedProjectModal.techStack || []).map((t, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => {
                    const cat = selectedProjectModal.category;
                    setSelectedProjectModal(null);
                    navigateToSection('contact', cat);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-xs sm:text-sm font-semibold text-white cursor-pointer"
                >
                  Bangun Proyek Serupa Bersama Kami
                </button>
                <button
                  onClick={() => setSelectedProjectModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          F. DIGITAL INVITATION SHOWCASE (5 INTERACTIVE CONCEPTS)
      ===================================================================== */}
      <section id="invitations" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                03 / Bespoke Digital Invitations
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Showcase Undangan Digital Interaktif
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8]">
                Pilih salah satu dari 5 konsep tema di bawah ini dan klik <strong>Preview Invitation</strong> untuk mencoba simulasi pembukaan sampul, hitung mundur acara, peta lokasi, hingga pengisian RSVP secara langsung.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-300">
              <CalendarHeart className="w-4 h-4" /> Semua tema dapat dikustomisasi penuh
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedInvitations.map((inv) => (
              <div
                key={inv.id}
                className="rounded-3xl bg-[#101625] border border-white/10 hover:border-violet-500/40 overflow-hidden flex flex-col justify-between transition-all duration-300 group"
              >
                {/* Theme Preview Header */}
                <div
                  className="p-6 relative overflow-hidden border-b border-white/10"
                  style={{ backgroundColor: inv.colorScheme.bg }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-slate-200">
                      {inv.badge}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: inv.colorScheme.accent }}
                    >
                      {inv.styleCategory}
                    </span>
                  </div>

                  {/* Mini Invitation Cover Card Mockup */}
                  <div
                    className="rounded-2xl p-5 text-center space-y-2 shadow-xl transform group-hover:-translate-y-1 transition-transform"
                    style={{
                      backgroundColor: inv.colorScheme.card,
                      border: `1px solid ${inv.colorScheme.border}`
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                      {inv.eventTitle}
                    </p>
                    <h4 className="text-base font-bold text-white truncate">
                      {inv.coupleOrHost}
                    </h4>
                    <p className="text-[11px] text-slate-300">{inv.eventDateDisplay}</p>
                  </div>
                </div>

                {/* Theme Footer & Trigger */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">{inv.name}</h3>
                    <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">{inv.storyText}</p>
                  </div>

                  <div className="pt-3 flex items-center gap-2">
                    <button
                      onClick={() => openInvitationPreview(inv.id)}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-xs font-semibold text-white inline-flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> Preview Invitation
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          G. ABOUT KUDOSTACK & H. WORKFLOW (HOW WE WORK)
      ===================================================================== */}
      <section
        id="about"
        className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-[#101625]/40 border-y border-white/5"
      >
        <div className="max-w-7xl mx-auto space-y-20">
          {/* About Brand Philosophy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
                04 / About KudoStack
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                {siteSettings.aboutHeadline}
              </h2>
              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                {siteSettings.aboutDescription}
              </p>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Kami memosisikan KudoStack sebagai mitra teknologi kreatif yang bertumbuh bersama kebutuhan Anda—mulai dari menghadirkan identitas digital pertama hingga membangun aplikasi web operasional yang terstruktur.
              </p>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'Design Clarity',
                  desc: 'Mengutamakan tipografi yang mudah dibaca, kontras visual yang terukur, dan tata letak bebas distraksi.'
                },
                {
                  title: 'Engineering Discipline',
                  desc: 'Struktur komponen yang rapi, validasi data di sisi klien dan server, serta perhatian penuh pada keamanan.'
                },
                {
                  title: 'Transparent Communication',
                  desc: 'Diskusi ruang lingkup yang jujur sejak awal proyek tanpa janji berlebihan di luar kesepakatan.'
                },
                {
                  title: 'Easy Content Ownership',
                  desc: 'Dilengkapi kapabilitas manajemen konten agar pemilik bisnis memiliki kendali penuh atas pembaruan informasi.'
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#080B14] border border-white/10 space-y-2"
                >
                  <span className="text-xs font-mono text-cyan-400">0{idx + 1}</span>
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Stage Workflow */}
          <div className="space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                How We Work
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                Alur Pengerjaan yang Terstruktur & Transparan
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                Empat tahapan sistematis untuk memastikan visi Anda diterjemahkan menjadi produk digital yang siap diluncurkan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {WORKFLOW_STEPS.map((step, idx) => (
                <div
                  key={step.number}
                  className="relative p-6 rounded-3xl bg-[#080B14] border border-white/10 hover:border-violet-500/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-mono font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                      {step.number}
                    </span>
                    {idx < 3 && (
                      <ArrowRight className="w-4 h-4 text-slate-600 hidden lg:block" />
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-white">{step.title}</h4>
                  <p className="text-[11px] font-medium text-cyan-400 uppercase tracking-wider">
                    {step.subtitle}
                  </p>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          I. TESTIMONIALS (ONLY RENDERED IF ENABLED & REAL REVIEWS EXIST)
      ===================================================================== */}
      {siteSettings.showTestimonialsSection && testimonials.length > 0 && (
        <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
                Client Feedback
              </span>
              <h2 className="text-3xl font-bold text-white mt-2">Ulasan Klien KudoStack</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="p-6 rounded-3xl bg-[#101625] border border-white/10 space-y-4"
                >
                  <p className="text-sm text-slate-200 leading-relaxed">“{t.quote}”</p>
                  <div>
                    <p className="text-sm font-bold text-white">{t.clientName}</p>
                    <p className="text-xs text-slate-400">{t.clientRole}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          J. INTERACTIVE FAQ ACCORDION
      ===================================================================== */}
      <section id="faq" className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              05 / Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Informasi jelas mengenai layanan, fleksibilitas kustomisasi, dan proses pemesanan di KudoStack.
            </p>
          </div>

          <div className="space-y-3">
            {publishedFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all ${
                    isOpen
                      ? 'bg-[#101625] border-violet-500/40'
                      : 'bg-[#101625]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm sm:text-base font-semibold text-white">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-cyan-400 shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#94A3B8] leading-relaxed border-t border-white/5">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          K. CONTACT & PROJECT INQUIRY SECTION
      ===================================================================== */}
      <section
        id="contact"
        className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-[#101625]/60 border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Contact Info & Honest WhatsApp Trigger */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
              06 / Start a Conversation
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {siteSettings.contactHeadline}
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              Ceritakan ide website, kebutuhan landing page bisnis, atau konsep acara untuk undangan digital Anda. Setiap pesan yang dikirimkan melalui formulir ini langsung tercatat di modul <strong>Inquiry Management (/admin)</strong>.
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#080B14] border border-white/10 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Email Resmi</span>
                  <a
                    href={`mailto:${siteSettings.businessEmail}`}
                    className="text-sm font-semibold text-white hover:text-cyan-300"
                  >
                    {siteSettings.businessEmail}
                  </a>
                </div>
              </div>

              {/* Configurable WhatsApp Button (No Fake Number) */}
              <div className="p-4 rounded-2xl bg-[#080B14] border border-white/10 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Konsultasi via WhatsApp</span>
                    <span className="text-sm font-semibold text-white">
                      {siteSettings.whatsappNumber
                        ? `+${siteSettings.whatsappNumber}`
                        : 'Nomor WhatsApp Belum Dikonfigurasi'}
                    </span>
                  </div>
                </div>

                {siteSettings.whatsappNumber ? (
                  <a
                    href={`https://wa.me/${siteSettings.whatsappNumber.replace(
                      /[^0-9]/g,
                      ''
                    )}?text=${encodeURIComponent(
                      'Halo KudoStack, saya tertarik untuk mendiskusikan pembuatan proyek digital.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" /> Hubungi via WhatsApp
                  </a>
                ) : (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 flex items-center justify-between gap-2">
                    <span>
                      Kami tidak menampilkan nomor palsu. Pemilik dapat mengaktifkan nomor WhatsApp melalui menu Settings di Admin CMS.
                    </span>
                    <button
                      onClick={() => {
                        setCurrentRoute('admin');
                        setActiveAdminTab('settings');
                      }}
                      className="text-cyan-400 hover:underline shrink-0 font-medium"
                    >
                      Atur di /admin →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Validated Inquiry Form */}
          <div className="lg:col-span-7">
            <form
              onSubmit={handleInquirySubmit}
              noValidate
              className="rounded-3xl bg-[#080B14] border border-white/10 p-6 sm:p-8 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white">Project Inquiry Form</h3>
                <span className="text-xs text-slate-400">* Wajib diisi</span>
              </div>

              {/* Honeypot anti-spam field (hidden from real users) */}
              <input
                type="text"
                name="website_url_honeypot"
                value={inquiryForm.honeypot}
                onChange={(e) => setInquiryForm({ ...inquiryForm, honeypot: e.target.value })}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.name}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                    placeholder="Nama Anda"
                    className={`w-full px-4 py-3 rounded-xl bg-[#101625] border text-sm text-white focus:outline-none ${
                      inquiryErrors.name ? 'border-rose-500' : 'border-white/10 focus:border-violet-500'
                    }`}
                  />
                  {inquiryErrors.name && (
                    <p className="text-[11px] text-rose-400 mt-1">{inquiryErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Alamat Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    placeholder="nama@perusahaan.com"
                    className={`w-full px-4 py-3 rounded-xl bg-[#101625] border text-sm text-white focus:outline-none ${
                      inquiryErrors.email ? 'border-rose-500' : 'border-white/10 focus:border-violet-500'
                    }`}
                  />
                  {inquiryErrors.email && (
                    <p className="text-[11px] text-rose-400 mt-1">{inquiryErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nomor WhatsApp (Opsional)
                  </label>
                  <input
                    type="tel"
                    value={inquiryForm.whatsapp}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, whatsapp: e.target.value })}
                    placeholder="+62 812..."
                    className="w-full px-4 py-3 rounded-xl bg-[#101625] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nama Perusahaan / Brand / Acara (Opsional)
                  </label>
                  <input
                    type="text"
                    value={inquiryForm.company}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, company: e.target.value })}
                    placeholder="Nama bisnis atau acara Anda"
                    className="w-full px-4 py-3 rounded-xl bg-[#101625] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Jenis Layanan *
                  </label>
                  <select
                    value={inquiryForm.serviceType}
                    onChange={(e) =>
                      setInquiryForm({ ...inquiryForm, serviceType: e.target.value })
                    }
                    className="w-full px-3.5 py-3 rounded-xl bg-[#101625] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    {publishedServices.map((s) => (
                      <option key={s.id} value={s.title} className="bg-[#080B14]">
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Estimasi Anggaran (Opsional)
                  </label>
                  <select
                    value={inquiryForm.budgetRange}
                    onChange={(e) =>
                      setInquiryForm({ ...inquiryForm, budgetRange: e.target.value })
                    }
                    className="w-full px-3.5 py-3 rounded-xl bg-[#101625] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="" className="bg-[#080B14]">
                      Pilih Kisaran...
                    </option>
                    <option value="< Rp 3.000.000" className="bg-[#080B14]">
                      &lt; Rp 3.000.000
                    </option>
                    <option value="Rp 3.000.000 - Rp 10.000.000" className="bg-[#080B14]">
                      Rp 3 Juta – Rp 10 Juta
                    </option>
                    <option value="Rp 10.000.000 - Rp 25.000.000" className="bg-[#080B14]">
                      Rp 10 Juta – Rp 25 Juta
                    </option>
                    <option value="> Rp 25.000.000" className="bg-[#080B14]">
                      &gt; Rp 25 Juta
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Target Penyelesaian (Opsional)
                  </label>
                  <select
                    value={inquiryForm.targetTimeline}
                    onChange={(e) =>
                      setInquiryForm({ ...inquiryForm, targetTimeline: e.target.value })
                    }
                    className="w-full px-3.5 py-3 rounded-xl bg-[#101625] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="" className="bg-[#080B14]">
                      Pilih Timeline...
                    </option>
                    <option value="Segera (1 - 2 Minggu)" className="bg-[#080B14]">
                      Segera (1 - 2 Minggu)
                    </option>
                    <option value="1 Bulan" className="bg-[#080B14]">
                      Sekitar 1 Bulan
                    </option>
                    <option value="1 - 3 Bulan" className="bg-[#080B14]">
                      1 - 3 Bulan
                    </option>
                    <option value="Fleksibel" className="bg-[#080B14]">
                      Fleksibel
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Deskripsi Kebutuhan Proyek *
                </label>
                <textarea
                  rows={4}
                  required
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                  placeholder="Ceritakan gambaran proyek, fitur utama yang dibutuhkan, atau referensi visual yang Anda inginkan..."
                  className={`w-full px-4 py-3 rounded-xl bg-[#101625] border text-sm text-white focus:outline-none ${
                    inquiryErrors.message
                      ? 'border-rose-500'
                      : 'border-white/10 focus:border-violet-500'
                  }`}
                />
                {inquiryErrors.message && (
                  <p className="text-[11px] text-rose-400 mt-1">{inquiryErrors.message}</p>
                )}
              </div>

              {/* Honest Submission Feedback */}
              {inquiryStatus === 'success' && lastSubmittedInquiry && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs text-emerald-200">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" /> Permintaan Proyek Tercatat di Sistem Sesi!
                  </div>
                  <p className="leading-relaxed">
                    Terima kasih, <strong>{lastSubmittedInquiry.name}</strong>. Pesan Anda untuk layanan <strong>{lastSubmittedInquiry.serviceType}</strong> telah disimpan ke dalam state database sesi ini (tanpa berpura-pura mengirim email eksternal sebelum SMTP dikonfigurasi).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRoute('admin');
                      setActiveAdminTab('inquiries');
                    }}
                    className="underline font-semibold text-cyan-300"
                  >
                    Lihat pesan Anda di Admin Dashboard (/admin) →
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={inquiryStatus === 'submitting'}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-50 font-semibold text-sm sm:text-base text-white shadow-xl shadow-violet-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {inquiryStatus === 'submitting' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Memvalidasi & Menyimpan...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Kirim Rincian Proyek
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* =====================================================================
          L. FOOTER
      ===================================================================== */}
      <footer className="relative z-10 bg-[#080B14] border-t border-white/10 pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          <div className="lg:col-span-4 space-y-4">
            <KudoStackLogo brandName={siteSettings.brandName} />
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-sm leading-relaxed">
              {siteSettings.tagline} Studio teknologi untuk website modern, aplikasi web, dan undangan digital eksklusif.
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <p>Email: {siteSettings.businessEmail}</p>
              {siteSettings.whatsappNumber && <p>WhatsApp: +{siteSettings.whatsappNumber}</p>}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white">Navigation</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#94A3B8]">
              {[
                { label: 'Home', id: 'home' },
                { label: 'Services', id: 'services' },
                { label: 'Portfolio Showcase', id: 'portfolio' },
                { label: 'Digital Invitations', id: 'invitations' },
                { label: 'About & Workflow', id: 'about' },
                { label: 'FAQ', id: 'faq' }
              ].map((nav) => (
                <li key={nav.id}>
                  <button
                    onClick={() => navigateToSection(nav.id)}
                    className="hover:text-cyan-300 transition-colors"
                  >
                    {nav.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white">Services</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#94A3B8]">
              {publishedServices.map((srv) => (
                <li key={srv.id}>
                  <button
                    onClick={() => navigateToSection('contact', srv.title)}
                    className="hover:text-violet-300 transition-colors text-left"
                  >
                    {srv.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white">Platform CMS</h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Kelola portofolio, layanan, dan inquiry proyek secara langsung tanpa mengedit kode.
            </p>
            <button
              onClick={() => setCurrentRoute('admin')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-cyan-300 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" /> Buka /admin
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {siteSettings.brandName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateToSection('faq')}
              className="hover:text-slate-300 transition-colors"
            >
              Kebijakan Privasi & Ketentuan Layanan
            </button>
            <span>From Vision to Digital Reality.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}