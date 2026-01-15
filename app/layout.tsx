import type { Metadata } from "next";
import { Geist, Geist_Mono, Great_Vibes } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  variable: "--font-title",
  subsets: ["latin"],
  weight: "400",
});
export const metadata: Metadata = {
  title: "Casamento • Galeria de Memórias",
  description: "Envie fotos e vídeos para celebrar este momento",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${geistSans.variable} ${geistMono.variable} ${greatVibes.variable}`}>
        {children}
      </body>
    </html>
  );
}
