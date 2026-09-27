import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { errorMessage } from "../lib/api.js";
import { firstName } from "../lib/format.js";
import { useAuth } from "./AuthContext.jsx";
import { useToast } from "./ToastContext.jsx";
import { useChatEvents } from "./SocketContext.jsx";

const ShopContext = createContext(null);

const EMPTY_CART = { items: [], count: 0, subtotal: 0 };

/** Customer state shared across pages: the bag, favourites and unread messages, and whether the floating chat is open. */
export function ShopProvider({ children }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [cart, setCart] = useState(EMPTY_CART);
  const [favorites, setFavorites] = useState(() => new Set());
  const [unread, setUnread] = useState(0);
  const [bump, setBump] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  const loadCart = useCallback(async () => {
    try {
      const { data } = await api.get("/cart");
      setCart(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "CUSTOMER") return;
    loadCart();
    api.get("/favorites").then(({ data }) => setFavorites(new Set(data.map((p) => p.id)))).catch(() => {});
    api.get("/chat/unread").then(({ data }) => setUnread(data.unread)).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useChatEvents((event) => {
    if (event.type !== "message" || !event.message?.fromAdmin) return;
    if (pathRef.current.startsWith("/chat") || chatOpenRef.current) return;
    setUnread((n) => n + 1);
    toast(`New message from ${firstName(event.message.senderName)} at the shop`);
  });

  const isFavorite = useCallback((id) => favorites.has(id), [favorites]);

  const toggleFavorite = useCallback(
    async (product) => {
      const was = favorites.has(product.id);
      // Optimistic: update first, roll back on error.
      setFavorites((s) => {
        const n = new Set(s);
        if (was) n.delete(product.id);
        else n.add(product.id);
        return n;
      });
      try {
        if (was) {
          await api.delete(`/favorites/${product.id}`);
          toast("Removed from favourites");
        } else {
          await api.post(`/favorites/${product.id}`);
          toast(`${product.name} saved to favourites`);
        }
      } catch (e) {
        setFavorites((s) => {
          const n = new Set(s);
          if (was) n.add(product.id);
          else n.delete(product.id);
          return n;
        });
        toast(errorMessage(e), "error");
      }
    },
    [favorites, toast],
  );

  const addToCart = useCallback(
    async (product, quantity = 1, option = null) => {
      try {
        const { data } = await api.post("/cart", { productId: product.id, quantity, option });
        setCart(data);
        setBump((b) => b + 1);
        toast(`${product.name} added to your bag`);
        return true;
      } catch (e) {
        toast(errorMessage(e), "error");
        return false;
      }
    },
    [toast],
  );

  const updateQuantity = useCallback(
    async (itemId, quantity) => {
      try {
        const { data } = await api.patch(`/cart/${itemId}`, { quantity });
        setCart(data);
      } catch (e) {
        toast(errorMessage(e), "error");
        loadCart();
      }
    },
    [toast, loadCart],
  );

  const removeItem = useCallback(
    async (itemId) => {
      try {
        const { data } = await api.delete(`/cart/${itemId}`);
        setCart(data);
      } catch (e) {
        toast(errorMessage(e), "error");
      }
    },
    [toast],
  );

  const value = useMemo(
    () => ({
      cart, setCart, loadCart, addToCart, updateQuantity, removeItem, bump,
      favorites, isFavorite, toggleFavorite, unread, setUnread, chatOpen, setChatOpen,
    }),
    [cart, loadCart, addToCart, updateQuantity, removeItem, bump, favorites, isFavorite, toggleFavorite, unread, chatOpen],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export const useShop = () => useContext(ShopContext);
