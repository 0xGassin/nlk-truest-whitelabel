export function getSidebarPopupClasses(highContrastPopups: "off" | "sidebar" | "full") {
  const enabled = highContrastPopups !== "off";
  return {
    content: enabled ? "border-neutral-800 bg-[#090909] text-white shadow-black/10" : "",
    item: enabled
      ? "text-white focus:!bg-white/10 focus:!text-white hover:!bg-white/10 hover:!text-white [&_svg:not([class*='text-'])]:!text-white"
      : "",
    itemMuted: enabled ? "text-white data-[disabled]:opacity-100 data-[disabled]:text-white" : "",
    labelMuted: enabled ? "text-white" : "text-muted-foreground",
    separator: enabled ? "bg-white/10" : "",
    shortcut: enabled ? "text-white" : "text-muted-foreground",
  };
}
