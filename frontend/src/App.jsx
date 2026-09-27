import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { ShopProvider } from "./context/ShopContext.jsx";
import { PageLoader } from "./components/ui.jsx";
import { homeFor } from "./lib/routes.js";
import CustomerLayout from "./layouts/CustomerLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";

const AuthPage = lazy(() => import("./pages/auth/AuthPage.jsx"));
const Home = lazy(() => import("./pages/customer/Home.jsx"));
const Shop = lazy(() => import("./pages/customer/Shop.jsx"));
const ProductDetail = lazy(() => import("./pages/customer/ProductDetail.jsx"));
const Favorites = lazy(() => import("./pages/customer/Favorites.jsx"));
const Cart = lazy(() => import("./pages/customer/Cart.jsx"));
const Orders = lazy(() => import("./pages/customer/Orders.jsx"));
const Visit = lazy(() => import("./pages/customer/Visit.jsx"));
const Chat = lazy(() => import("./pages/customer/Chat.jsx"));
const Profile = lazy(() => import("./pages/shared/Profile.jsx"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const Products = lazy(() => import("./pages/admin/Products.jsx"));
const ProductEditor = lazy(() => import("./pages/admin/ProductEditor.jsx"));
const Inventory = lazy(() => import("./pages/admin/Inventory.jsx"));
const AdminOrders = lazy(() => import("./pages/admin/Orders.jsx"));
const Customers = lazy(() => import("./pages/admin/Customers.jsx"));
const Messages = lazy(() => import("./pages/admin/Messages.jsx"));

function RootRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  return <Navigate to={user ? homeFor(user) : "/auth"} replace />;
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (user) return <Navigate to={homeFor(user)} replace />;
  return children;
}

function RequireRole({ role, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader inline />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/auth"
          element={
            <GuestOnly>
              <AuthPage />
            </GuestOnly>
          }
        />
        <Route
          element={
            <RequireRole role="CUSTOMER">
              <ShopProvider>
                <CustomerLayout />
              </ShopProvider>
            </RequireRole>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/visit" element={<Visit />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route
          path="/admin"
          element={
            <RequireRole role="ADMIN">
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductEditor />} />
          <Route path="products/:id" element={<ProductEditor />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="messages" element={<Messages />} />
          <Route path="profile" element={<Profile admin />} />
        </Route>
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}
