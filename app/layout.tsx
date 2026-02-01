import AppShell from "@/components/layout/AppShell";
import "@blocknote/mantine/style.css";
import "./globals.css";
import { DatabaseProvider } from "@/providers/database-provider";
import { ThreadsProvider } from "@/providers/threads-provider";
import { ChatProvider } from "@/providers/chat-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { SubscriptionProvider } from "@/providers/subscription-provider";
import { ViewProvider } from "@/providers/view-provider";
import { DeveloperModeProvider } from "@/providers/developer-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ViewProvider>
          <DeveloperModeProvider>
            <DatabaseProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <ThreadsProvider>
                    <ChatProvider>
                      <AppShell>{children}</AppShell>
                    </ChatProvider>
                  </ThreadsProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </DatabaseProvider>
          </DeveloperModeProvider>
        </ViewProvider>
      </body>
    </html>
  );
}
