import { createClient } from "@/lib/supabase/server";
import type { Book, ChatMessage, ChatSession } from "@/types/database";

export interface ChatSessionWithBook extends ChatSession {
  book: Pick<Book, "id" | "title" | "author"> | null;
}

export async function getMyChatSessions(classId: string): Promise<ChatSessionWithBook[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("chat_sessions")
    .select("*, book:books(id, title, author)")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  return (data as ChatSessionWithBook[]) ?? [];
}

export async function getChatSession(sessionId: string): Promise<ChatSessionWithBook | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_sessions")
    .select("*, book:books(id, title, author)")
    .eq("id", sessionId)
    .maybeSingle();
  return (data as ChatSessionWithBook) ?? null;
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  return (data as ChatMessage[]) ?? [];
}
