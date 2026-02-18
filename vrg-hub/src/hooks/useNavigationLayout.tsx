// Navigation is now fixed to horizontal top navigation only
// Sidebar option has been removed

export function useNavigationLayout() {
  return {
    layout: "topnav" as const,
    isSidebarLayout: false,
    isTopNavLayout: true,
    toggleLayout: () => {}, // No-op, only topnav is supported
    setNavigationLayout: () => {}, // No-op, only topnav is supported
  };
}
