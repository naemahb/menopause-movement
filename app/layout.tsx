import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QuizProvider } from "@/lib/QuizContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Menopause Movement",
  description: "Find the right exercise for your stage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QuizProvider>{children}</QuizProvider>
      </body>
    </html>
  );
}
