const LINKS = [
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
  active: "queue" | "pricebook" | "vehicles" | "templates" | "stats" | "log";
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <a href="/queue" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Entity Mobile Detailing" width={40} height={40} className="rounded-lg object-cover" />
        <span className="font-semibold text-neutral-100 hidden sm:inline">Entity Mobile Detailing</span>
      </a>
      <nav className="flex items-center gap-1 flex-wrap">
        {LINKS.map((link) => {
          const isActive = link.href === `/${active}`;
          return (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                isActive
                  ? "text-brand font-medium bg-brand/10"
                  : "text-neutral-400 hover:text-neutral-200"
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
