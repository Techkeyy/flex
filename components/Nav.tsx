"use client";

import Link from "next/link";

export default function Nav({ variant = "app" }: { variant?: "app" | "docs" }) {
  const scrollTo = (id: string) => () =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <Link href="/" className="brand">
          <span className="brand-name">Flex</span>
        </Link>
        <div className="nav-links">
          {variant === "app" ? (
            <>
              <button className="navlink hide-sm" onClick={scrollTo("how")}>
                How it works
              </button>
              <button className="navlink hide-sm" onClick={scrollTo("console")}>
                Console
              </button>
              <Link className="navlink" href="/docs">
                Docs
              </Link>
            </>
          ) : (
            <Link className="navlink" href="/">
              ← Console
            </Link>
          )}
          <a
            className="pill-live"
            href="https://runtime.badtheorylabs.com"
            target="_blank"
            rel="noreferrer"
          >
            <span className="dot" />
            <span>On the BTL runtime</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
