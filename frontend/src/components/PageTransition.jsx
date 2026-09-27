import { Component } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { EASE } from "./ui.jsx";

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  componentDidUpdate(prev) {
    // Reset on navigation.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page-error">
        <h1>
          Something went <em>wrong.</em>
        </h1>
        <p>This page couldn't be displayed. Please try again.</p>
        <button type="button" className="btn btn--solid" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </div>
    );
  }
}

/** Fades and rises each route in (no exit animation), inside a page-level error boundary. */
export default function PageTransition({ context }) {
  const { pathname } = useLocation();
  return (
    <PageErrorBoundary resetKey={pathname}>
      <motion.div
        key={pathname}
        className="page"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <Outlet context={context} />
      </motion.div>
    </PageErrorBoundary>
  );
}
