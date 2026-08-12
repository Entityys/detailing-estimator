const LINKS = [
  { href: "/queue", label: "Pipeline" },
  { href: "/vehicles", label: "Size list" },
  { href: "/log", label: "History" },
];

export function Header({ active }: { active: "queue" | "vehicles" | "log" }) {
  return (
    <header className="flex items-center justify-between mb-6">
      <a href="/queue" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Entity Mobile Detailing" width={40} height={40} className="rounded-lg object-cover" />
        <span className="font-semibold text-neutral-100 hidden sm:inline">Entity Mobile Detailing</span>
      </a>
      <nav className="flex items-center gap-1">
        {LINKS.map((link) => {
          const isActive = link.href === `/${active}`;
          return (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-1.5 rounded-md transition ${
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
