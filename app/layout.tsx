import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "DBLE | DTC Marketing Engine",
  description: "AI-powered marketing intelligence platform for DTC e-commerce brands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cormorantGaramond.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
