import AppShell from "@/components/layout/AppShell";
import "./globals.css";
import { ThreadsProvider } from "@/providers/threads-provider";
import { ChatProvider } from "@/providers/chat-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThreadsProvider>
          <ChatProvider>
            <AppShell>{children}</AppShell>
          </ChatProvider>
        </ThreadsProvider>
      </body>
    </html>
  );
}
