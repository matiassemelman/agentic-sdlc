import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (SIL Open Font License) so builds never depend on the network.
const display = localFont({
  src: "../fonts/Besley-800.woff2",
  weight: "800",
  variable: "--font-display",
  display: "swap",
});
const text = localFont({
  src: [
    { path: "../fonts/LibreFranklin-variable.woff2", weight: "400 600", style: "normal" },
    { path: "../fonts/LibreFranklin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-text",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hotel Mirador · Santa Catalina, Palma",
  description: "A fictional four-room hotel in Palma de Mallorca, built and changed by a software factory.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
