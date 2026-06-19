import type { SVGProps } from "react";

/* Lightweight, on-brand line icons (24×24, stroke = currentColor). Decorative
   by default (aria-hidden); pass `title` to label one for AT. */

const P: Record<string, JSX.Element> = {
  // experience zones
  digital: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4M7 9l2 2-2 2M13 13h4" />
    </>
  ),
  sports: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  challenge: (
    <>
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
    </>
  ),
  kids: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 21c0-4 3.2-6.5 7-6.5S19 17 19 21M9 8h6" />
    </>
  ),
  family: (
    <>
      <circle cx="8" cy="8" r="2.6" />
      <circle cx="16" cy="8" r="2.6" />
      <path d="M3.5 20c0-3.2 2-5.2 4.5-5.2s4.5 2 4.5 5.2M11.5 20c0-3.2 2-5.2 4.5-5.2s4.5 2 4.5 5.2" />
    </>
  ),
  // operating pillars
  ops: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  tech: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9zM9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
    </>
  ),
  content: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  pay: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M2.5 10h19M6 14h4" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M3 11h4l2-3 2.5 6 2-4 1.5 2H21M9 20h6M12 16v4" />
    </>
  ),
  // platform / misc
  remote: (
    <>
      <rect x="8" y="2" width="8" height="20" rx="3" />
      <path d="M12 6v3M10 18h4" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-7" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  location: (
    <>
      <path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V5z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="5" cy="5" r="1.8" />
      <circle cx="19" cy="5" r="1.8" />
      <circle cx="5" cy="19" r="1.8" />
      <circle cx="19" cy="19" r="1.8" />
      <path d="M10.4 10.4 6.3 6.3M13.6 10.4l4.1-4.1M10.4 13.6l-4.1 4.1M13.6 13.6l4.1 4.1" />
    </>
  ),
  // impact categories
  economy: (
    <>
      <path d="M4 19V9M9 19V5M14 19v-7M19 19V8M3 22h18" />
    </>
  ),
  tourism: (
    <>
      <path d="M12 2v20M12 6l7-2v6l-7 2M12 6L5 4v6l7 2" />
    </>
  ),
  society: (
    <>
      <circle cx="12" cy="7" r="3" />
      <circle cx="5.5" cy="10" r="2.2" />
      <circle cx="18.5" cy="10" r="2.2" />
      <path d="M3 19c0-2.5 1.6-4 3.6-4M21 19c0-2.5-1.6-4-3.6-4M7.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5" />
    </>
  ),
  youth: (
    <>
      <circle cx="12" cy="6" r="3" />
      <path d="M12 9v7M8 13l4-2 4 2M9 21l3-5 3 5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 24,
  title,
  ...rest
}: { name: IconName; size?: number; title?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {P[name] ?? P.spark}
    </svg>
  );
}
