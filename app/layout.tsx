import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { InitializationScript } from "@/components/initialization-script";

export const metadata: Metadata = {
  title: "CVFacil.NG",
  description: "A professional resume builder with dark mode aesthetics, real-time preview, and dashboard management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Google Fonts: Inter and Outfit */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />
        
        {/* Material Symbols */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="bg-forest-deep text-stone-200 h-full overflow-x-hidden selection:bg-primary selection:text-white">
        {/* App Initialization Script - Deve rodra ANTES do AuthProvider */}
        <InitializationScript />

        {/* Global Exception Handler - Captura erros de rendering */}
        <ErrorBoundary>
          {/* App com AuthProvider interno */}
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
