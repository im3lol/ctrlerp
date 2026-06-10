import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";

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
    <ClerkProvider appearance={{ variables: { colorPrimary: '#7C3AED' } }}>
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
    </ClerkProvider>
  );
}
