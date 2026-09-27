import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, MessageCircle, X } from "lucide-react";
import { useShop } from "../context/ShopContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import useCustomerChat, { QUICK_REPLIES } from "../lib/useCustomerChat.js";
import { SHOP } from "../lib/format.js";
import ChatThread from "./ChatThread.jsx";
import { Badge, EASE } from "./ui.jsx";

const PHONE = "(max-width: 640px)";

/** "Ask the shop": a floating button that opens the conversation in a chat window over the page. */
export default function ChatBubble() {
  const location = useLocation();
  const { unread, chatOpen: open, setChatOpen: setOpen } = useShop();
  const { connected } = useSocket();
  const { messages, loading, send, hasSentBefore } = useCustomerChat(open);
  const [draft, setDraft] = useState("");
  const panel = useRef(null);
  const button = useRef(null);

  // Close when the page changes, e.g. after following an attached part.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, setOpen]);

  useEffect(() => () => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    // On phones the window fills the screen, so the page behind it shouldn't scroll.
    const lock = window.matchMedia(PHONE).matches;
    if (lock) document.body.style.overflow = "hidden";
    const focus = window.setTimeout(() => panel.current?.querySelector("textarea")?.focus({ preventScroll: true }), 320);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (lock) document.body.style.overflow = "";
      window.clearTimeout(focus);
    };
  }, [open, setOpen]);

  return (
    <div className={`chat-bubble ${open ? "is-open" : ""}`}>
      <AnimatePresence>
        {open && (
          <motion.section
            key="chat-window"
            ref={panel}
            id="chat-window"
            className="chat-window"
            role="dialog"
            aria-label="Chat with the shop"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <header className="chat-window__head">
              <span className="chat-panel__avatar chat-window__avatar" aria-hidden="true">
                R·A
                <i className={connected ? "is-online" : ""} />
              </span>
              <div className="chat-window__who">
                <p className="chat-window__name">{SHOP.name}</p>
                <p className="chat-window__status">{connected ? "Online · usually replies within the hour" : "Connecting…"}</p>
              </div>
              <Link to="/chat" className="chat-window__action" aria-label="Open the full chat page" title="Open full chat">
                <Maximize2 size={17} strokeWidth={1.7} />
              </Link>
              <button type="button" className="chat-window__action" onClick={() => setOpen(false)} aria-label="Close chat" title="Close">
                <X size={19} strokeWidth={1.7} />
              </button>
            </header>
            <ChatThread
              messages={messages}
              loading={loading}
              viewerIsAdmin={false}
              emptyText="Say hello — we usually reply within the hour."
              onSend={send}
              draft={draft}
              setDraft={setDraft}
              quickReplies={QUICK_REPLIES}
              showQuickReplies={!loading && !hasSentBefore}
            />
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        ref={button}
        type="button"
        className={`chat-fab ${unread && !open ? "has-unread" : ""}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="chat-window"
        aria-label={open ? "Close chat" : `Ask the shop${unread ? `, ${unread} unread` : ""}`}
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 380, damping: 24, delay: 0.6 }}
      >
        <span className="chat-fab__icon" aria-hidden="true">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={open ? "close" : "chat"}
              initial={{ opacity: 0, rotate: open ? -90 : 90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: open ? 90 : -90, scale: 0.6 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              {open ? <X size={24} strokeWidth={1.8} /> : <MessageCircle size={24} strokeWidth={1.8} />}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="chat-fab__label" aria-hidden="true">Ask the shop</span>
        {!open && <Badge count={unread} className="badge--rust" />}
      </motion.button>
    </div>
  );
}
