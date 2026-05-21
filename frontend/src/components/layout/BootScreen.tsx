import { motion } from "framer-motion";

export function BootScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 grid place-items-center bg-[#07080f]"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="grid h-12 w-12 place-items-center rounded-lg border border-neon-cyan/40 bg-neon-cyan/[0.06]">
          <span className="text-display text-base font-bold text-neon-cyan">P</span>
        </div>
        <div className="text-center">
          <div className="text-display text-sm font-semibold tracking-[0.32em] text-white">
            POD·DOCTOR
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/40">
            Initializing
          </div>
        </div>
        <div className="relative h-px w-40 overflow-hidden bg-white/10">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-y-0 w-1/2 bg-neon-cyan"
          />
        </div>
      </div>
    </motion.div>
  );
}
