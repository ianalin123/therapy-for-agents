import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentTherapy — Put AI on the Couch",
  description: "Interrogate AI decision-making through therapeutic questioning. Map the hidden psychology behind AI behavior.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="antialiased font-sans bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        {children}
      </body>
    </html>
  );
}
