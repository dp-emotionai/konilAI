import "./globals.css";
import { UIProvider } from "@/components/layout/Providers";
import TopNav from "@/components/layout/TopNav";
import Shell from "@/components/layout/Shell";
import Footer from "@/components/layout/Footer";
import RoleGuard from "@/components/layout/RoleGuard";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <ThemeProvider>
          <UIProvider>
            <TopNav />
            <Shell>
              <RoleGuard>{children}</RoleGuard>
            </Shell>
            <Footer />
          </UIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}