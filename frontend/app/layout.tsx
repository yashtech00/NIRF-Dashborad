import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import  NavBar  from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NIRF Rankings Dashboard",
  description:
    "NIRF ranking data extraction, AI processing, and Excel export dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(geist.variable, inter.variable)}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
