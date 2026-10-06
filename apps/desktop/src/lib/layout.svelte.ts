import { pathOf } from "$lib/nav";

const SIDEBAR_KEY = "irontion.sidebar";
/** Windows at least this wide (px) show the sidebar inline; narrower ones use a slide-over drawer. */
const WIDE_QUERY = "(min-width: 1024px)";

function readWideOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== "closed";
  } catch {
    return true; // Storage unavailable: start with the sidebar shown.
  }
}

/** Whether the sidebar is shown. The saved choice applies to wide windows; the drawer is temporary. */
class LayoutState {
  /** Wide windows: the user's saved choice. */
  wideOpen = $state(readWideOpen());
  /** Narrow windows: opened on demand and closed again after navigating. */
  drawerOpen = $state(false);
  wide = $state(globalThis.matchMedia?.(WIDE_QUERY).matches ?? true);
  open = $derived(this.wide ? this.wideOpen : this.drawerOpen);
  /** The last page outside Settings, where "Back" leaves it to. */
  lastApp = $state("/");

  /** Remember a page outside Settings as the one Back returns to. */
  rememberApp(url: URL) {
    this.lastApp = pathOf(url) + url.search;
  }

  /** Track the window width. Returns a cleanup function. */
  init(): () => void {
    const media = matchMedia(WIDE_QUERY);
    this.wide = media.matches;
    const onChange = (event: MediaQueryListEvent) => {
      this.wide = event.matches;
      this.drawerOpen = false;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }

  toggleSidebar() {
    if (!this.wide) {
      this.drawerOpen = !this.drawerOpen;
      return;
    }
    this.wideOpen = !this.wideOpen;
    try {
      localStorage.setItem(SIDEBAR_KEY, this.wideOpen ? "open" : "closed");
    } catch {
      // Not remembered across launches; still applies for this session.
    }
  }

  /** After navigating, a drawer gets out of the way; an inline sidebar stays put. */
  afterNavigate() {
    this.drawerOpen = false;
  }
}

export const layout = new LayoutState();
