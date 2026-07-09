// Single source of truth for Commvault / Clumio branding.
// Used in: app header, app footer, PDF export, Word (.docx) export.

export const COMPANY = "Commvault";
export const PRODUCT = "Clumio";
export const PROJECT_TITLE = "KB-Creator";

export const FOOTER_LINKS: string[] = [
  "Legal",
  "Privacy Policy",
  "Trust Center",
  "Modern Slavery Act",
  "Cookie Preferences",
];

// Real Commvault logo: outline hexagon + outline 3D cube.
// Reconstructed as a clean vector from the official logo image.
// Two colour variants — use the right one for the background:

// Purple strokes — for light/white backgrounds (app header on dark, docx header)
export const LOGO_SVG_INNER = `<path d="M 50.00,5.00 L 88.97,27.50 L 88.97,72.50 L 50.00,95.00 L 11.03,72.50 L 11.03,27.50 Z" fill="none" stroke="#7a3f89" stroke-width="5.5" stroke-linejoin="round"/><polygon points="50.0,30.1 67.8,39.7 50.0,49.3 32.2,39.7" fill="none" stroke="#7a3f89" stroke-width="3.5" stroke-linejoin="round"/><polygon points="32.2,39.7 32.2,64.4 50.0,74.0 50.0,49.3" fill="none" stroke="#7a3f89" stroke-width="3.5" stroke-linejoin="round"/><polygon points="67.8,39.7 67.8,64.4 50.0,74.0 50.0,49.3" fill="none" stroke="#7a3f89" stroke-width="3.5" stroke-linejoin="round"/>`;

// White strokes — for dark/black backgrounds (PDF header/footer, app footer)
export const LOGO_SVG_INNER_WHITE = `<path d="M 50.00,5.00 L 88.97,27.50 L 88.97,72.50 L 50.00,95.00 L 11.03,72.50 L 11.03,27.50 Z" fill="none" stroke="white" stroke-width="5.5" stroke-linejoin="round"/><polygon points="50.0,30.1 67.8,39.7 50.0,49.3 32.2,39.7" fill="none" stroke="white" stroke-width="3.5" stroke-linejoin="round"/><polygon points="32.2,39.7 32.2,64.4 50.0,74.0 50.0,49.3" fill="none" stroke="white" stroke-width="3.5" stroke-linejoin="round"/><polygon points="67.8,39.7 67.8,64.4 50.0,74.0 50.0,49.3" fill="none" stroke="white" stroke-width="3.5" stroke-linejoin="round"/>`;

// 128×128 PNG (purple on transparent) — for Word ImageRun which can't use SVG directly.
export const LOGO_PNG_DATA_URI = "data:image/png;base64,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";

export interface SocialLink {
  name: string;
  url: string;
  svg: string;
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

export const COPYRIGHT = `© ${new Date().getFullYear()} Commvault`;
