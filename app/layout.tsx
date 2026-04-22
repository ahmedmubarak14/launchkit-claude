import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchKit",
  description: "The commerce operator for Zid merchants.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
