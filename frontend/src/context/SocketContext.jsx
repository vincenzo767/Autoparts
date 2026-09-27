import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import api from "../lib/api.js";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext({ connected: false, subscribe: () => () => {} });

const WS_URL = import.meta.env.VITE_WS_URL;

function sameOriginUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

/** One STOMP connection per signed-in user; events fan out to registered listeners. */
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set());

  useEffect(() => {
    if (!user) {
      setConnected(false);
      return undefined;
    }
    const client = new Client({
      brokerURL: WS_URL || sameOriginUrl(),
      reconnectDelay: 4000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      // With split hosting the session cookie can't reach the API host, so use a short-lived ticket.
      beforeConnect: async () => {
        if (!WS_URL) return;
        try {
          const { data } = await api.get("/auth/ws-ticket");
          client.brokerURL = `${WS_URL}?ticket=${encodeURIComponent(data.ticket)}`;
        } catch {
          client.brokerURL = WS_URL;
        }
      },
      onConnect: () => {
        setConnected(true);
        client.subscribe("/user/queue/chat", (frame) => {
          let event;
          try {
            event = JSON.parse(frame.body);
          } catch {
            return;
          }
          listeners.current.forEach((fn) => {
            try {
              fn(event);
            } catch (e) {
              console.error(e);
            }
          });
        });
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    return () => {
      setConnected(false);
      client.deactivate();
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

/** Calls the latest handler for every chat event. */
export function useChatEvents(handler) {
  const { subscribe } = useSocket();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe]);
}
