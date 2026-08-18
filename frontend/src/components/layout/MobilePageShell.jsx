import React from "react";
import "./MobilePageShell.css";

export function MobilePageShell({ children, className = "" }) {
  return (
    <div className="mobile-page-viewport">
      <main className={`mobile-page-shell ${className}`.trim()}>
        {children}
      </main>
    </div>
  );
}
