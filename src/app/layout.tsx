import type { Metadata } from "next";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import "./globals.css";
import { PaperGrainOverlay } from "@/components/common/PaperGrainOverlay";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Living Legacy — your family, on the record",
  description:
    "A shared family voice archive. Claude conducts the interview; the family keeps the conversation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral text-primary type-body relative">
        <PaperGrainOverlay />
        {children}
      </body>
    </html>
  );
}
