export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ChatState {
  messages: Message[];
  hasStarted: boolean;
  isLoading: boolean;
}
