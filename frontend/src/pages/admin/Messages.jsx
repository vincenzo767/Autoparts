import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MessagesSquare, Search } from "lucide-react";
import api, { errorMessage } from "../../lib/api.js";
import { compactPeso, formatDate, relativeTime } from "../../lib/format.js";
import { useChatEvents } from "../../context/SocketContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import ChatThread from "../../components/ChatThread.jsx";
import { Avatar, Chip } from "../../components/ui.jsx";

const QUICK = [
  "Yes, it's in stock — shall I reserve it for you?",
  "What's your vehicle's make, model and year? I'll double-check fitment.",
  "You're welcome to visit and see the part before you buy.",
];

export default function Messages() {
  const { refreshCounts } = useOutletContext();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const selected = params.get("c") ? Number(params.get("c")) : null;
  const [conversations, setConversations] = useState(null);
  const [customers, setCustomers] = useState([]);
  // Messages are tagged with the customer they belong to, so a stale thread never shows as loaded.
  const [thread, setThread] = useState({ id: null, messages: [] });
  const messages = thread.messages;
  const loadingThread = thread.id !== selected;
  const setMessages = (fn) => setThread((t) => ({ ...t, messages: typeof fn === "function" ? fn(t.messages) : fn }));
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");

  const loadList = useCallback(
    () => api.get("/admin/chat/conversations").then(({ data }) => setConversations(data)).catch(() => setConversations([])),
    [],
  );

  useEffect(() => {
    document.title = "Messages — Rovi Admin";
    loadList();
    api.get("/admin/customers").then(({ data }) => setCustomers(data)).catch(() => {});
  }, [loadList]);

  useEffect(() => {
    if (!selected) return;
    setDraft("");
    api
      .get(`/admin/chat/${selected}/messages`)
      .then(({ data }) => setThread({ id: selected, messages: data }))
      .catch(() => setThread({ id: selected, messages: [] }));
    api.post(`/admin/chat/${selected}/read`).then(() => refreshCounts()).catch(() => {});
    setConversations((list) => list && list.map((c) => (c.customerId === selected ? { ...c, unread: 0 } : c)));
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useChatEvents((event) => {
    if (event.customerId === selected) {
      if (event.type === "message" && event.message) {
        setMessages((list) => (list.some((m) => m.id === event.message.id) ? list : [...list, event.message]));
        if (!event.message.fromAdmin) {
          api.post(`/admin/chat/${selected}/read`).then(() => refreshCounts()).catch(() => {});
        }
      } else if (event.type === "read-by-customer") {
        setMessages((list) => list.map((m) => (m.fromAdmin ? { ...m, read: true } : m)));
      }
    }
    if (event.type === "message") loadList();
  });

  const customer = customers.find((c) => c.id === selected);
  const list = useMemo(() => {
    let rows = conversations || [];
    // A customer opened from elsewhere who hasn't chatted yet goes first.
    if (selected && customer && !rows.some((c) => c.customerId === selected)) {
      rows = [{ customerId: customer.id, customerName: customer.fullName, customerEmail: customer.email,
        customerAvatar: customer.avatarUrl, lastMessage: null, lastAt: null, unread: 0, isNew: true }, ...rows];
    }
    const term = q.trim().toLowerCase();
    return term ? rows.filter((c) => c.customerName.toLowerCase().includes(term) || c.customerEmail.toLowerCase().includes(term)) : rows;
  }, [conversations, selected, customer, q]);

  const current = list.find((c) => c.customerId === selected) || (customer && { customerName: customer.fullName, customerEmail: customer.email, customerAvatar: customer.avatarUrl });

  const send = async (content, productId) => {
    try {
      const { data } = await api.post(`/admin/chat/${selected}/messages`, { content, productId });
      setMessages((l) => (l.some((m) => m.id === data.id) ? l : [...l, data]));
      loadList();
      return true;
    } catch (e) {
      toast(errorMessage(e), "error");
      return false;
    }
  };

  const select = (id) => setParams(id ? { c: String(id) } : {}, { replace: false });

  return (
    <div className={`inbox ${selected ? "has-selection" : ""}`}>
      <aside className="inbox__list" aria-label="Conversations">
        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <label htmlFor="conv-search" className="sr-only">Search conversations</label>
          <input id="conv-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" />
        </div>
        <ul>
          {list.map((c) => {
            const active = c.customerId === selected;
            return (
              <li key={c.customerId}>
                <button type="button" className={`conv ${active ? "is-active" : ""} ${c.unread ? "is-unread" : ""}`} onClick={() => select(c.customerId)} aria-current={active || undefined}>
                  {active && <motion.span layoutId="conv-active" className="conv__hl" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                  <Avatar name={c.customerName} src={c.customerAvatar} size={40} />
                  <span className="conv__body">
                    <span className="conv__top">
                      <span className="conv__name">{c.customerName}</span>
                      <span className="conv__time">{c.isNew ? "new" : relativeTime(c.lastAt)}</span>
                    </span>
                    <span className="conv__preview">
                      {c.isNew ? "Start a new conversation" : `${c.lastFromAdmin ? "You: " : ""}${c.lastMessage}`}
                    </span>
                  </span>
                  {c.unread > 0 && <span className="conv__unread">{c.unread}</span>}
                </button>
              </li>
            );
          })}
          {conversations && list.length === 0 && <li className="inbox__none">No conversations yet.</li>}
        </ul>
      </aside>

      <section className="inbox__thread" aria-label="Conversation">
        {selected && current ? (
          <>
            <header className="inbox__head">
              <button type="button" className="icon-btn inbox__back" onClick={() => select(null)} aria-label="Back to conversations">
                <ArrowLeft size={20} />
              </button>
              <Avatar name={current.customerName} src={current.customerAvatar} size={38} />
              <div>
                <p className="inbox__name">{current.customerName}</p>
                <p className="inbox__email">{current.customerEmail}</p>
              </div>
            </header>
            <ChatThread
              key={selected}
              messages={messages}
              loading={loadingThread}
              viewerIsAdmin
              emptyText="No messages yet — say hello and introduce yourself."
              onSend={send}
              draft={draft}
              setDraft={setDraft}
              quickReplies={QUICK}
              showQuickReplies
            />
          </>
        ) : (
          <div className="inbox__empty">
            <MessagesSquare size={36} strokeWidth={1.2} aria-hidden="true" />
            <h2>Select a <em>conversation</em></h2>
            <p>Customer messages arrive here in real time.</p>
          </div>
        )}
      </section>

      <aside className="inbox__info" aria-label="Customer details">
        {selected && customer ? (
          <>
            <Avatar name={customer.fullName} src={customer.avatarUrl} size={84} />
            <p className="inbox__info-name">{customer.fullName}</p>
            <Chip tone={customer.enabled ? "steel" : "rust"}>{customer.enabled ? "Active" : "Suspended"}</Chip>
            <ul className="inbox__contact">
              <li>{customer.email}</li>
              {customer.phone && <li>{customer.phone}</li>}
              {customer.address && <li>{customer.address}</li>}
            </ul>
            <dl className="cust__facts">
              <div><dt>Reservations</dt><dd>{customer.orders}</dd></div>
              <div><dt>Reserved value</dt><dd>{compactPeso(customer.spent)}</dd></div>
              <div><dt>Customer since</dt><dd>{formatDate(customer.createdAt)}</dd></div>
              <div><dt>Last seen</dt><dd>{customer.lastLoginAt ? relativeTime(customer.lastLoginAt) : "—"}</dd></div>
            </dl>
            <Link to="/admin/orders" className="link-line">View reservations →</Link>
          </>
        ) : null}
      </aside>
    </div>
  );
}
