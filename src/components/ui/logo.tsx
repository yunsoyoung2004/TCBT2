/**
 * The app's mark: a rounded square in the brand blue, a white speech-bubble
 * (this is a conversational therapy app), with a checkmark inside it (a
 * completed/approved exchange). Matches the existing PWA icon
 * (src/app/icon.png, apple-icon.png, manifest.json) exactly, as a real
 * inline SVG instead of a raster image -- crisp at any size, and usable
 * directly in the clinician sidebar, patient header, and auth screens,
 * which the PNG assets (favicon/home-screen only) never were. Fixed colors
 * regardless of light/dark theme -- same convention as the navy sidebar
 * itself (see app-shell.tsx), a brand mark isn't meant to re-theme.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="100" height="100" rx="24" fill="#3566AE" />
      {/* Speech-bubble body + tail, as two plain shapes instead of one
          hand-rolled path -- much harder to get subtly wrong. */}
      <rect x="25" y="25" width="50" height="38" rx="10" fill="white" />
      <path d="M32 63 L32 78 L48 63 Z" fill="white" />
      <path d="M38 44l8 8 16-16" stroke="#3566AE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
