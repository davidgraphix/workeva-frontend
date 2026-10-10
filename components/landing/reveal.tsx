"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

type Variant = "up" | "right" | "scale" | "draw";

/** Fades/slides its children in the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  variant = "up",
  as = "div",
  className = "",
}: {
  children?: ReactNode;
  delay?: number;
  variant?: Variant;
  as?: "div" | "li" | "section";
  className?: string;
}) {
  const Tag = as as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
      className={`reveal reveal-${variant} ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}