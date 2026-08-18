import React from "react";
import { cardLarge } from "../assets";

export function PaperCard({
  background = cardLarge,
  className = "",
  children,
  ...props
}) {
  return (
    <section
      {...props}
      className={`paper-card ${className}`.trim()}
      style={{ backgroundImage: `url(${background})` }}
    >
      {children}
    </section>
  );
}
