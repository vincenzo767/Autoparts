import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SHOP, hoursLine } from "../../lib/format.js";
import { useSocket } from "../../context/SocketContext.jsx";
import useCustomerChat, { QUICK_REPLIES } from "../../lib/useCustomerChat.js";
import ChatThread from "../../components/ChatThread.jsx";

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { connected } = useSocket();
  const { messages, loading, send: sendMessage, hasSentBefore } = useCustomerChat(true);
  const [draft, setDraft] = useState("");
  const [attached, setAttached] = useState(null);

  useEffect(() => {
    document.title = "Chat with the shop — Rovi Autoparts Surplus";
    const { product, draft: stateDraft } = location.state || {};
    if (product) {
      setAttached(product);
      setDraft(`Hello! I'd like to know more about the ${product.name}.`);
    } else if (stateDraft) {
      setDraft(stateDraft);
    }
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (content, productId) => {
    const ok = await sendMessage(content, productId);
    if (ok) setAttached(null);
    return ok;
  };

  return (
    <div className="chat-page container">
      <aside className="chat-side">
        <p className="eyebrow eyebrow--amber">Parts consultation</p>
        <h1 className="chat-side__title">
          Speak with <em>our team</em>
        </h1>
        <p className="chat-side__text">
          Not sure a part fits? Send your vehicle's make, model and year and the part you need — our team at the Cebu City
          shop answers personally.
        </p>
        <ul className="chat-side__facts">
          <li>🕒 Replies usually within the hour, {hoursLine()}</li>
          <li>📍 {SHOP.address}</li>
          <li>
            📞{" "}
            {SHOP.phones.map((p, i) => (
              <span key={p}>
                {i > 0 && " · "}
                <a href={`tel:${SHOP.phonesIntl[i]}`}>{p}</a>
              </span>
            ))}
          </li>
        </ul>
      </aside>
      <section className="chat-panel" aria-label="Conversation with the shop">
        <header className="chat-panel__head">
          <span className="chat-panel__avatar" aria-hidden="true">
            R·A
            <i className={connected ? "is-online" : ""} />
          </span>
          <div>
            <p className="chat-panel__name">{SHOP.name}</p>
            <p className="chat-panel__status">{connected ? "Online · the shop team" : "Connecting…"}</p>
          </div>
        </header>
        <ChatThread
          messages={messages}
          loading={loading}
          viewerIsAdmin={false}
          emptyText="Say hello — we usually reply within the hour."
          onSend={send}
          draft={draft}
          setDraft={setDraft}
          attached={attached}
          onClearAttached={() => setAttached(null)}
          quickReplies={QUICK_REPLIES}
          showQuickReplies={!loading && !hasSentBefore}
        />
      </section>
    </div>
  );
}
