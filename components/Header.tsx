const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/queue", label: "Pipeline" },
  { href: "/pricebook", label: "Price Book" },
  { href: "/vehicles", label: "Size List" },
  { href: "/templates", label: "Templates" },
  { href: "/stats", label: "Stats" },
  { href: "/log", label: "History" },
];

export function Header({
  active,
}: {
  active: "home" | "queue" | "pricebook" | "vehicles" | "templates" | "stats" | "log";
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-neutral-900">
      <a href="/queue" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Entity Mobile Detailing" width={36} height={36} className="rounded-lg object-cover" />
        <span className="font-medium text-neutral-100 hidden sm:inline">Entity Mobile Detailing</span>
      </a>
      <nav className="flex items-center gap-1 flex-wrap">
        {LINKS.map((link) => {
          const isActive = link.href === `/${active}`;
          return (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-2 rounded-md transition-colors duration-150 whitespace-nowrap ${
                isActive
                  ? "text-accent font-medium bg-accent/10"
                  : "text-neutral-500 hover:text-neutral-200"
              }`}
            >
              {link.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
