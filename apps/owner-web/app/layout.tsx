import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rental Platform Owner",
  description:
    "Occupancy, collection, applications, and everything that needs a decision today.",
};

/**
 * Light, and pinned there.
 *
 * `data-theme="light"` is set explicitly rather than left to the system
 * preference, so a machine in dark mode still gets the surface this product
 * was designed and reviewed in. HeroUI reads the same attribute, so its
 * components follow without a second switch to keep in sync.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
