import type { Metadata, Viewport } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "TBCT Protocol Studio",
  description: "Clinician-Authored Treatment Protocol Workspace",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TBCT Studio" },
};

export const viewport: Viewport = {
  themeColor: "#3566AE",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
