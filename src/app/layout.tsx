import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "كنترول",
  description: "نظام إدارة الموارد المؤسسية المتكامل - كنترول",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
        style={{ fontFamily: "var(--font-thmanyah-sans)" }}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
