import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MegaMenuSection {
  title: string;
  items: MegaMenuItem[];
}

interface MegaMenuItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
  description?: string;
  external?: boolean;
  onClick?: () => void;
}

interface MegaMenuProps {
  sections: MegaMenuSection[];
  quickActions?: ReactNode;
  width?: string;
  onClose?: () => void;
}

export function MegaMenu({ sections, quickActions, width = "w-[700px]", onClose }: MegaMenuProps) {
  const location = useLocation();

  const isActive = (href?: string) => {
    if (!href) return false;
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className={cn(
      "rounded-2xl shadow-elevated bg-popover border",
      width
    )}>
      <div className="p-6">
        {/* Quick Actions Section (if provided) */}
        {quickActions && (
          <div className="mb-6 pb-6 border-b">
            {quickActions}
          </div>
        )}

        {/* Menu Sections */}
        <div className={cn(
          "grid gap-8",
          sections.length === 1 ? "grid-cols-1" :
          sections.length === 2 ? "grid-cols-2" :
          "grid-cols-3"
        )}>
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isItemActive = isActive(item.href);

                  if (item.external && item.href) {
                    return (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                            "hover:bg-accent/50 hover:text-primary group"
                          )}
                          onClick={onClose}
                        >
                          {ItemIcon && <ItemIcon className="w-4 h-4 flex-shrink-0" />}
                          <span className={cn(
                            isItemActive ? "font-semibold text-primary" : "text-foreground"
                          )}>
                            {item.label}
                          </span>
                        </a>
                      </li>
                    );
                  }

                  if (item.onClick) {
                    return (
                      <li key={item.label}>
                        <button
                          onClick={() => {
                            item.onClick?.();
                            onClose?.();
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                            "hover:bg-accent/50 hover:text-primary group text-left"
                          )}
                        >
                          {ItemIcon && <ItemIcon className="w-4 h-4 flex-shrink-0" />}
                          <div className="flex-1">
                            <span className={cn(
                              isItemActive ? "font-semibold text-primary" : "text-foreground"
                            )}>
                              {item.label}
                            </span>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={item.label}>
                      <Link
                        to={item.href || '#'}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                          "hover:bg-accent/50 hover:text-primary group"
                        )}
                        onClick={onClose}
                      >
                        {ItemIcon && <ItemIcon className="w-4 h-4 flex-shrink-0" />}
                        <div className="flex-1">
                          <span className={cn(
                            isItemActive ? "font-semibold text-primary" : "text-foreground"
                          )}>
                            {item.label}
                          </span>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
