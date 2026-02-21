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
  title: "Briefly — Remember What Matters",
  description: "An AI grief companion that helps you become the author of what someone meant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="antialiased" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", background: "#0D0D0F", color: "#F0EDE8" }}>
        {children}
      </body>
    </html>
  );
}
