import { useCallback, useEffect, useRef, useState } from "react";
import api, { errorMessage } from "./api.js";
import { useShop } from "../context/ShopContext.jsx";
import { useChatEvents } from "../context/SocketContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export const QUICK_REPLIES = [
  "Will this fit my vehicle?",
  "Can you check stock for another part?",
  "Do you offer a check warranty?",
  "What are your payment options?",
];

/**
 * The customer's conversation with the shop, shared by the chat page and the floating chat.
 * The thread loads the first time `active` is true; while active, incoming replies are marked read.
 */
export default function useCustomerChat(active) {
  const { setUnread } = useShop();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  const markRead = useCallback(() => {
    api.post("/chat/read").catch(() => {});
    setUnread(0);
  }, [setUnread]);

  useEffect(() => {
    if (!active) return;
    if (!loaded.current) {
      loaded.current = true;
      api
        .get("/chat/messages")
        .then(({ data }) => setMessages(data))
        .catch(() => setMessages([]))
        .finally(() => setLoading(false));
    }
    markRead();
  }, [active, markRead]);

  useChatEvents((event) => {
    if (!loaded.current) return;
    if (event.type === "message" && event.message) {
      setMessages((list) => (list.some((m) => m.id === event.message.id) ? list : [...list, event.message]));
      if (event.message.fromAdmin && activeRef.current) markRead();
    } else if (event.type === "read-by-admin") {
      setMessages((list) => list.map((m) => (m.fromAdmin ? m : { ...m, read: true })));
    }
  });

  const send = useCallback(
    async (content, productId) => {
      try {
        const { data } = await api.post("/chat/messages", { content, productId });
        setMessages((list) => (list.some((m) => m.id === data.id) ? list : [...list, data]));
        return true;
      } catch (e) {
        toast(errorMessage(e), "error");
        return false;
      }
    },
    [toast],
  );

  return { messages, loading, send, hasSentBefore: messages.some((m) => !m.fromAdmin) };
}
