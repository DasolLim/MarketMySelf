import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "PixelHire — The Talent Billboard",
  description: "Own a section. Show the world who you are. 500 talent sections across 5 pages.",
  openGraph: {
    title: "PixelHire",
    description: "The talent billboard. Own your pixel.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", background: "#060810" }}>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
