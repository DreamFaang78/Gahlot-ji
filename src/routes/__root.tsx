import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "TIMKOLAS — Command Everything" },
      {
        name: "description",
        content:
          "TIMKOLAS Pro — a precision gaming controller engineered for players who refuse to lose. Sub-millisecond wireless, RGB on every edge, remappable back paddles.",
      },
      { name: "author", content: "TIMKOLAS" },
      { name: "theme-color", content: "#060608" },
      { property: "og:title", content: "TIMKOLAS — Command Everything" },
      {
        property: "og:description",
        content:
          "Premium gaming controllers built for PC, console, and mobile. Low-latency wireless, RGB, ergonomic grip.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "TIMKOLAS" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TIMKOLAS — Command Everything" },
      {
        name: "twitter:description",
        content:
          "Premium gaming controllers built for PC, console, and mobile. Low-latency wireless, RGB, ergonomic grip.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * Strips any "Edit with Lovable" badge that the hosting/preview platform injects
 * at runtime (it is not part of this codebase). Runs client-side only and keeps
 * watching, so the badge is removed everywhere the site is served.
 */
function VendorBadgeGuard() {
  useEffect(() => {
    const SELECTORS = [
      "#lovable-badge",
      "#lovable-badge-container",
      "[data-lovable-badge]",
      "[id*='lovable-badge']",
      "a[href*='lovable.dev']",
      "a[href*='lovable.app']",
    ].join(",");

    const strip = () => {
      document.querySelectorAll(SELECTORS).forEach((el) => el.remove());
    };

    strip();
    const observer = new MutationObserver(strip);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <VendorBadgeGuard />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
