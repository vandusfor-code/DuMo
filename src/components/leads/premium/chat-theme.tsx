"use client";

import { createContext, useContext } from "react";

export type ChatUiTheme = "default" | "premium";

const ChatThemeContext = createContext<ChatUiTheme>("default");

export function ChatThemeProvider({
  theme,
  children,
}: {
  theme: ChatUiTheme;
  children: React.ReactNode;
}) {
  return <ChatThemeContext.Provider value={theme}>{children}</ChatThemeContext.Provider>;
}

export function useChatUiTheme(): ChatUiTheme {
  return useContext(ChatThemeContext);
}
