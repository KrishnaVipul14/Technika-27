import type { Metadata } from "next";

export const siteName = "Technika '27";
export const siteDescription =
  "Technika '27 is the techno-cultural festival of Birla Institute of Technology, Patna — where technology, creativity, and extraordinary possibilities meet.";
export const socialImage = "/images/social-card.jpg";
export const googleSiteVerification =
  process.env.GOOGLE_SITE_VERIFICATION ||
  "o2R9wl2JjVxm9frnLSPwNKWtry-DVPyp9IsaI4pdgjU";

function normalizeOrigin(value?: string) {
  if (!value) return undefined;
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`)
      .origin;
  } catch {
    return undefined;
  }
}

export const siteUrl =
  normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
  normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  "http://localhost:3000";
export const indexable =
  process.env.NODE_ENV === "production" &&
  process.env.VERCEL_ENV !== "preview" &&
  !siteUrl.includes("localhost");

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export const pageSeo = {
  "/": {
    title: "Technika '27 | BIT Patna Techno-Cultural Festival",
    description:
      "Discover Technika '27, BIT Patna's techno-cultural festival where robotics, hackathons, creative challenges, and extraordinary ideas meet a little magic.",
    label: "Home",
  },
  "/marauders-map": {
    title: "The Marauder's Map — Technika '27 Event Explorer",
    description:
      "Explore Technika '27 events on an illustrative Marauder's Map. Search the event directory, save your quests, and follow official campus routes when venue data is confirmed.",
    label: "Marauder's Map",
  },
  "/events": {
    title: "Event Registry — Technika '27",
    description:
      "Explore the future event chambers of Technika '27. Official event information will be published here when confirmed.",
    label: "Events",
  },
  "/technical": {
    title: "Technical Chamber — Technika '27",
    description:
      "The technical event chamber for Technika '27 is being prepared. Official challenges, rules, and registration details will appear here when confirmed.",
    label: "Technical",
  },
  "/cultural": {
    title: "Cultural Chamber — Technika '27",
    description:
      "The cultural event chamber for Technika '27 is being prepared. Official programme information will appear here when confirmed.",
    label: "Cultural",
  },
  "/art-craft": {
    title: "Art & Craft Chamber — Technika '27",
    description:
      "The art and craft chamber for Technika '27 is being prepared. Official briefs and entry details will appear here when confirmed.",
    label: "Art & Craft",
  },
  "/frame-focus": {
    title: "Frame & Focus Chamber — Technika '27",
    description:
      "The visual event chamber for Technika '27 is being prepared. Official briefs and submission details will appear here when confirmed.",
    label: "Frame & Focus",
  },
  "/esports": {
    title: "E-sports Chamber — Technika '27",
    description:
      "The e-sports event chamber for Technika '27 is being prepared. Official games, rules, and registration details will appear here when confirmed.",
    label: "E-sports",
  },
  "/merchandise": {
    title: "Festival Merchandise — Technika '27",
    description:
      "The official Technika '27 merchandise catalogue is being prepared. Product and ordering information will appear here when confirmed.",
    label: "Merchandise",
  },
  "/core": {
    title: "Organising Council — Technika '27",
    description:
      "The official organising council directory for Technika '27 will be revealed here when the roster is confirmed.",
    label: "Core Team",
  },
  "/devs": {
    title: "Web Sorcerers — Technika '27",
    description:
      "The official Technika '27 developers directory will be revealed here when credits and roles are confirmed.",
    label: "Developers",
  },
  "/timeline": {
    title: "Programme Timeline — Technika '27",
    description:
      "The official Technika '27 programme timeline will appear here when dates, sessions, and venues are confirmed.",
    label: "Timeline",
  },
  "/event-timeline": {
    title: "Live Event Timeline — Technika '27",
    description:
      "The live Technika '27 programme view will be enabled here when the official schedule feed exists.",
    label: "Live Timeline",
  },
  "/accommodation": {
    title: "Guest Quarters — Technika '27",
    description:
      "Official Technika '27 accommodation information will appear here when arrangements are confirmed.",
    label: "Accommodation",
  },
  "/registrations": {
    title: "Technika '27 Registrations | BIT Patna",
    description:
      "Prepare for Technika '27 registrations at BIT Patna. Explore the four competition tracks, participation guidance, FAQs, and registration updates.",
    label: "Registrations",
  },
  "/members": {
    title: "Technika '27 Organising Team | BIT Patna",
    description:
      "Meet the organising council, student volunteers, web team, and faculty mentors behind Technika '27 at Birla Institute of Technology, Patna.",
    label: "Members",
  },
  "/delegate": {
    title: "Technika '27 College Delegates | BIT Patna",
    description:
      "Bring your college contingent to Technika '27 at BIT Patna. Find delegate updates about inter-college participation, passes, accommodation, and campus access.",
    label: "Delegate",
  },
  "/alumni": {
    title: "Technika '27 Alumni & Memories | BIT Patna",
    description:
      "Rediscover the Technika community at BIT Patna through alumni stories, festival memories, mentorship opportunities, and the Hall of Legacies.",
    label: "Alumni",
  },
  "/contact": {
    title: "Technika '27 Contact & Campus | BIT Patna",
    description:
      "Find BIT Patna campus directions and official enquiry updates for Technika '27 participants, college delegates, alumni, and festival partners.",
    label: "Contact",
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    description:
      "Read the Technika 2K26 privacy policy for website, account, contact, and analytics data.",
    label: "Privacy Policy",
  },
  "/delegate-registration": {
    title: "Delegate Registration — Technika ’27",
    description:
      "Prepare your college delegation for Technika ’27 at BIT Patna. Delegate registration details will be published when the official portal opens.",
    label: "Delegate Registration",
  },
  "/delegate-group-registration": {
    title: "Group Delegate Registration — Technika ’27",
    description:
      "Bring your full college contingent to Technika ’27 at BIT Patna. Group registration details will be announced with the delegate portal.",
    label: "Group Registration",
  },
} as const;

export type SitePath = keyof typeof pageSeo;

export function createPageMetadata(path: SitePath): Metadata {
  const page = pageSeo[path];
  const url = absoluteUrl(path);
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName,
      type: "website",
      locale: "en_IN",
      images: [
        {
          url: absoluteUrl(socialImage),
          width: 1200,
          height: 630,
          alt: "Technika '27 — BIT Patna techno-cultural festival",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [absoluteUrl(socialImage)],
    },
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
      : { index: false, follow: false },
  };
}

export function createPrivateMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: absoluteUrl(path) },
    robots: { index: false, follow: false },
  };
}

export function breadcrumbSchema(path: SitePath) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: siteName,
        item: absoluteUrl("/"),
      },
      ...(path === "/"
        ? []
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: pageSeo[path].label,
              item: absoluteUrl(path),
            },
          ]),
    ],
  };
}
