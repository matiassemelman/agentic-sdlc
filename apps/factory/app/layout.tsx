import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "agentic-sdlc factory",
  description: "The software factory's relay from the board to GitHub. The panel comes later.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f4f4f2", color: "#1c1c1a" }}>{children}</body>
    </html>
  );
}
