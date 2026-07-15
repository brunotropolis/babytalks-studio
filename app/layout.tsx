import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Baby Talks · Studio",
  description: "Publicar no Instagram @babytalks.evento",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
