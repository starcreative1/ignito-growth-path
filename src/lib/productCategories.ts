import {
  Download,
  GraduationCap,
  Phone,
  Crown,
  Users,
  Radio,
  Gift,
  Package,
  ExternalLink,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type ProductCategoryId =
  | "digital_download"
  | "online_course"
  | "coaching_call"
  | "membership"
  | "community"
  | "webinar"
  | "lead_magnet"
  | "bundle"
  | "external_link"
  | "custom_service";

export interface ProductCategoryDef {
  id: ProductCategoryId;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  /** Accent color as raw HSL string, used in inline style */
  hsl: string;
  /** Storefront CTA wording */
  cta: string;
  /** Marked free on storefront */
  isFree?: boolean;
  /** Phase 1 supports core fields only — heavier features are stubbed */
  comingSoonNote?: string;
}

export const PRODUCT_CATEGORIES: ProductCategoryDef[] = [
  {
    id: "digital_download",
    label: "Digital Download",
    short: "Downloads",
    description: "Ebooks, PDFs, templates, presets, audio, video, ZIPs.",
    icon: Download,
    hsl: "210 90% 56%",
    cta: "Buy now",
  },
  {
    id: "online_course",
    label: "Online Course",
    short: "Courses",
    description: "Multi-lesson video courses with progress tracking.",
    icon: GraduationCap,
    hsl: "270 70% 60%",
    cta: "Enroll",
    comingSoonNote: "Module/lesson builder, drip schedule and certificates ship in a follow-up.",
  },
  {
    id: "coaching_call",
    label: "Coaching Call",
    short: "Coaching",
    description: "1:1 consultations, coaching, mentorship sessions.",
    icon: Phone,
    hsl: "150 60% 45%",
    cta: "Book a call",
    comingSoonNote: "Calendar wiring + auto Meet link arrive with bookings v2.",
  },
  {
    id: "membership",
    label: "Membership",
    short: "Memberships",
    description: "Recurring access to gated content, community, or services.",
    icon: Crown,
    hsl: "38 92% 55%",
    cta: "Subscribe",
    comingSoonNote: "Stripe subscription tiers + free trials ship next.",
  },
  {
    id: "community",
    label: "Community Access",
    short: "Communities",
    description: "Paid Discord, Telegram, Circle, Slack, or in-app community.",
    icon: Users,
    hsl: "330 75% 60%",
    cta: "Join",
    comingSoonNote: "Auto-invite to Discord/Telegram arrives in a follow-up.",
  },
  {
    id: "webinar",
    label: "Webinar / Live Event",
    short: "Webinars",
    description: "Live workshops, masterclasses and group calls.",
    icon: Radio,
    hsl: "20 90% 55%",
    cta: "Reserve spot",
  },
  {
    id: "lead_magnet",
    label: "Lead Magnet (Free)",
    short: "Lead Magnets",
    description: "Free offer in exchange for email — grow your list.",
    icon: Gift,
    hsl: "175 70% 42%",
    cta: "Get it free",
    isFree: true,
  },
  {
    id: "bundle",
    label: "Bundle",
    short: "Bundles",
    description: "Combine multiple products at a discount.",
    icon: Package,
    hsl: "290 65% 55%",
    cta: "Get the bundle",
  },
  {
    id: "external_link",
    label: "External Link",
    short: "External",
    description: "Affiliate or external offers — redirect, no checkout.",
    icon: ExternalLink,
    hsl: "0 0% 45%",
    cta: "Visit link",
  },
  {
    id: "custom_service",
    label: "Custom Service",
    short: "Services",
    description: "Done-for-you, audits, custom work, manual fulfillment.",
    icon: Wrench,
    hsl: "230 60% 55%",
    cta: "Request",
    comingSoonNote: "Custom intake form builder ships in a follow-up.",
  },
];

export const CATEGORY_MAP: Record<ProductCategoryId, ProductCategoryDef> =
  PRODUCT_CATEGORIES.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {} as Record<ProductCategoryId, ProductCategoryDef>);

export const getCategory = (id?: string | null): ProductCategoryDef =>
  CATEGORY_MAP[(id as ProductCategoryId) || "digital_download"] ||
  CATEGORY_MAP.digital_download;

export const PRODUCT_SORT_OPTIONS = [
  { id: "recent", label: "Recently added" },
  { id: "best_selling", label: "Best selling" },
  { id: "highest_revenue", label: "Highest revenue" },
  { id: "alpha", label: "Alphabetical" },
  { id: "price_asc", label: "Price: low to high" },
  { id: "price_desc", label: "Price: high to low" },
] as const;

export type ProductSortId = (typeof PRODUCT_SORT_OPTIONS)[number]["id"];