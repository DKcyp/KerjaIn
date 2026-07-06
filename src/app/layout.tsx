import { Outfit } from 'next/font/google';
import './globals.css';
import PWARegister from '@/components/PWARegister';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { NotificationProvider } from '@/context/NotificationContext';
import ToastContainer from '@/components/ui/ToastContainer';
import ConditionalFooter from '@/layout/ConditionalFooter';
// import SnowfallWrapper from '@/components/SnowfallWrapper';

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata = {
  title: 'KerjaIn',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} bg-gray-100 dark:bg-gray-900`} suppressHydrationWarning>
        <PWARegister />
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <SocketProvider>
                <ToastProvider>
                  <SidebarProvider>
                    {/* <SnowfallWrapper /> */}
                    <div className="min-h-screen flex flex-col">
                      <main className="flex-1">
                        {children}
                        <ToastContainer />
                      </main>
                      <ConditionalFooter />
                    </div>
                  </SidebarProvider>
                </ToastProvider>
              </SocketProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// No global metadata title; let each page control its own title.
