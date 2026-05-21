import { useEffect, useState } from "react";

interface Props {
  text: string;
  speed?: number; // ms per char
  className?: string;
  caret?: boolean;
}

export function TypingText({ text, speed = 18, className, caret = true }: Props) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    if (!text) return;
    const id = setInterval(() => {
      setI((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span className={className}>
      {text.slice(0, i)}
      {caret && i < text.length && (
        <span className="inline-block w-[6px] -mb-0.5 h-3 align-middle bg-neon-cyan/80 animate-pulse ml-0.5" />
      )}
    </span>
  );
}
