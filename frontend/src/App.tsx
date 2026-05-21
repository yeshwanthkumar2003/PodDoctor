import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AppShell } from "./components/layout/AppShell";
import { BootScreen } from "./components/layout/BootScreen";

export default function App() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setBooted(true), 700);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      <AnimatePresence>{!booted && <BootScreen key="boot" />}</AnimatePresence>
      {booted && <AppShell />}
    </>
  );
}
