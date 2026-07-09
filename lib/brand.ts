// Single source of truth for the Commvault / Clumio branding shown in the
// app header, app footer, the printed PDF, and the Word export. Keeping it
// here means the on-screen banners and the exported documents stay in sync.

export const COMPANY = "Commvault";
export const PRODUCT = "Clumio";
export const PROJECT_TITLE = "KB-Creator";

// Footer text links. These match Commvault's own footer labels. No public
// deep-link URLs were provided for them, so they render as styled text (the
// social icons below are the linked items). Add `url` here later if wanted.
export const FOOTER_LINKS: string[] = [
  "Legal",
  "Privacy Policy",
  "Trust Center",
  "Modern Slavery Act",
  "Cookie Preferences",
];

// The diamond logo mark (inner SVG markup, 24x24 viewBox). Reused across the
// React banners and the string-built PDF markup.
export const LOGO_SVG_INNER = `<path d="M12 1.5 22 7v10l-10 5.5L2 17V7l10-5.5Z" stroke="#B78BE0" stroke-width="1.6" stroke-linejoin="round" fill="none"/><path d="M12 1.5v21M2 7l10 5.5L22 7M2 17l10-5.5L22 17" stroke="#B78BE0" stroke-width="1.2" fill="none"/>`;

export interface SocialLink {
  name: string;
  url: string;
  svg: string; // inner SVG markup, 24x24 viewBox, uses currentColor
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/Commvault/",
    svg: `<path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/>`,
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/commvault/",
    svg: `<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"/>`,
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/commvault",
    svg: `<path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9z"/>`,
  },
  {
    name: "X",
    url: "https://twitter.com/commvault",
    svg: `<path fill="currentColor" d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L6 22H2.9l7.5-8.6L2 2h6.6l4.6 6.7zm-1.1 18h1.7L7.3 3.8H5.5z"/>`,
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/user/commvault",
    svg: `<path fill="currentColor" d="M22 12s0-3.2-.4-4.7c-.2-.8-.9-1.5-1.7-1.7C18.3 5.2 12 5.2 12 5.2s-6.3 0-7.9.4c-.8.2-1.5.9-1.7 1.7C2 8.8 2 12 2 12s0 3.2.4 4.7c.2.8.9 1.5 1.7 1.7 1.6.4 7.9.4 7.9.4s6.3 0 7.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.5.4-4.7.4-4.7zM10 15V9l5.2 3z"/>`,
  },
];

export const COPYRIGHT = `© ${new Date().getFullYear()} ${COMPANY}`;
