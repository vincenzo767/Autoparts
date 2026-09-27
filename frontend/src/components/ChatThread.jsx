import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUp, X } from "lucide-react";
import { SHOP, dayLabel, formatPrice, formatTime, sized } from "../lib/format.js";
import { Avatar, EASE, Frame, Spinner } from "./ui.jsx";

const MAX = 2000;
const GROUP_MS = 5 * 60 * 1000;

function sameDay(a, b) {
  return dayLabel(a) === dayLabel(b);
}

/**
 * The conversation view shared by the customer chat and the admin inbox: day separators,
 * grouped bubbles, attached-part cards, read receipts and the composer.
 */
export default function ChatThread({
  messages,
  loading,
  viewerIsAdmin,
  emptyText,
  onSend,
  draft,
  setDraft,
  attached,
  onClearAttached,
  quickReplies = [],
  showQuickReplies = false,
}) {
  const scroller = useRef(null);
  const firstLoad = useRef(true);
  const known = useRef(null);
  const [sending, setSending] = useState(false);
  const text = useRef(null);

  // Messages present on first load don't animate in.
  if (known.current === null && !loading) known.current = new Set(messages.map((m) => m.id));

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || loading) return;
    if (firstLoad.current) {
      el.scrollTop = el.scrollHeight;
      firstLoad.current = false;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, loading]);

  useEffect(() => {
    const el = text.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const mine = (m) => m.fromAdmin === viewerIsAdmin;
  const lastMineId = [...messages].reverse().find(mine)?.id;

  const send = async (content) => {
    const value = (content ?? draft).trim();
    if (!value || sending) return;
    setSending(true);
    const ok = await onSend(value, attached?.id ?? null);
    setSending(false);
    if (ok !== false && content === undefined) setDraft("");
    text.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="thread">
      <div className="thread__scroll" ref={scroller} aria-live="polite">
        {loading ? (
          <div className="thread__loading">
            <Spinner size={20} />
          </div>
        ) : messages.length === 0 ? (
          <p className="thread__empty">{emptyText}</p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
            const grouped =
              prev && !newDay && prev.fromAdmin === m.fromAdmin &&
              new Date(m.createdAt) - new Date(prev.createdAt) < GROUP_MS;
            const isMine = mine(m);
            const animateIn = known.current && !known.current.has(m.id);
            const productLink = m.product && (viewerIsAdmin ? `/admin/products/${m.product.id}` : `/product/${m.product.id}`);
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <div className="thread__day">
                    <span>{dayLabel(m.createdAt)}</span>
                  </div>
                )}
                <motion.div
                  className={`msg ${isMine ? "msg--mine" : "msg--theirs"} ${grouped ? "msg--grouped" : ""}`}
                  initial={animateIn ? { opacity: 0, y: 14, scale: 0.98 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  {!isMine && !grouped && (
                    <div className="msg__sender">
                      {m.fromAdmin ? (
                        <span className="msg__mark" aria-hidden="true">R·A</span>
                      ) : (
                        <Avatar name={m.senderName} src={m.senderAvatar} size={22} />
                      )}
                      <span>{m.fromAdmin ? `${m.senderName} · ${SHOP.name}` : m.senderName}</span>
                    </div>
                  )}
                  <div className="msg__bubble">
                    {m.product && (
                      <Link to={productLink} className="msg__product">
                        <Frame src={sized(m.product.image, 200)} alt="" className="msg__product-img" />
                        <span className="msg__product-info">
                          <span className="msg__product-name">{m.product.name}</span>
                          <span className="msg__product-price">{formatPrice(m.product.price)}</span>
                        </span>
                      </Link>
                    )}
                    {/* Always plain text, never HTML. */}
                    <p className="msg__text">{m.content}</p>
                  </div>
                  <div className="msg__meta">
                    <time dateTime={m.createdAt}>{formatTime(m.createdAt)}</time>
                    {isMine && m.id === lastMineId && (
                      <span className={`msg__receipt ${m.read ? "is-read" : ""}`}>{m.read ? "✓✓ Seen" : "✓"}</span>
                    )}
                  </div>
                </motion.div>
              </Fragment>
            );
          })
        )}
      </div>

      <div className="composer">
        {attached && (
          <div className="composer__attached">
            <Frame src={sized(attached.images?.[0] || attached.image, 160)} alt="" className="composer__attached-img" />
            <div>
              <span className="eyebrow">Asking about</span>
              <p>{attached.name}</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClearAttached} aria-label="Remove the attached part">
              <X size={16} />
            </button>
          </div>
        )}
        {showQuickReplies && !draft && quickReplies.length > 0 && (
          <div className="composer__quick" role="list">
            {quickReplies.map((q) => (
              <button type="button" role="listitem" key={q} className="chip-btn" onClick={() => setDraft(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        <form
          className="composer__row"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            Message
          </label>
          <textarea
            id="chat-input"
            ref={text}
            rows={1}
            maxLength={MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
          />
          {draft.length > MAX - 200 && <span className="composer__count">{MAX - draft.length}</span>}
          <button type="submit" className="composer__send" disabled={!draft.trim() || sending} aria-label="Send message">
            {sending ? <Spinner size={16} /> : <ArrowUp size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
