import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { STUDENT_NAV_ITEMS, ADMIN_NAV_ITEMS } from "../constants/navItems";
import LogoFrame from "./LogoFrame";
import Logo from "../assets/logo.svg";
import {
  UserCircle,
  Menu,
  X,
  ChevronDown,
  GraduationCap,
  BookOpen,
  HelpCircle,
  Home,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import useChatStore from "../stores/useChatStore";

const iconMap = {
  Dashboard: Home,
  Academic: GraduationCap,
  Planner: BookOpen,
  Support: HelpCircle,
  Home: Home,
  Programmes: GraduationCap,
  Courses: BookOpen,
  Helpdesk: HelpCircle,
};

// 2. Define which nav items should show the chat badge
const CHAT_NAV_TITLES = ["Helpdesk", "Support", "Chat", "Messages"];

const TopNavBar = () => {
  const { user } = useAuth();
  const navItems =
    user?.role === "student" ? STUDENT_NAV_ITEMS : ADMIN_NAV_ITEMS;
  const location = useLocation();

  // 3. Destructure chat store
  const { connect, connected, loadUnreadCounts, unreadCounts } = useChatStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileSub, setOpenMobileSub] = useState(null);

  // Scroll state management
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  const [openMenuKey, setOpenMenuKey] = useState(null);
  const overlayRef = useRef(null);
  const timeoutRef = useRef(null);

  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const SCROLL_THRESHOLD = 100;
  const SCROLL_TOLERANCE = 10;

  // 4. Calculate Total Unread Count
  const totalUnread = useMemo(() => {
    return Object.values(unreadCounts || {}).reduce(
      (acc, count) => acc + count,
      0
    );
  }, [unreadCounts]);

  // 5. Initialize Global Socket Connection & Fetch Counts
  useEffect(() => {
    if (user) {
      // Connect if not already connected
      if (!connected) connect();
      // Load initial counts (in case socket events missed during reload)
      loadUnreadCounts();
    }
  }, [user, connected, connect, loadUnreadCounts]);

  // ... (Existing Scroll Logic stays the same) ...
  const updateNavbar = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDirection =
      currentScrollY > lastScrollY.current ? "down" : "up";
    const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);

    setScrolled(currentScrollY > 10);

    if (!mobileOpen) {
      if (
        scrollDirection === "down" &&
        currentScrollY > SCROLL_THRESHOLD &&
        scrollDelta > SCROLL_TOLERANCE &&
        !hidden
      ) {
        setHidden(true);
      } else if (
        (scrollDirection === "up" && scrollDelta > SCROLL_TOLERANCE) ||
        currentScrollY <= SCROLL_THRESHOLD
      ) {
        setHidden(false);
      }
    } else {
      setHidden(false);
    }

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, [hidden, mobileOpen]);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(updateNavbar);
      ticking.current = true;
    }
  }, [updateNavbar]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleScroll]);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMobileSub(null);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [mobileOpen]);

  const resetNavbarVisibility = useCallback(() => {
    setHidden(false);
    lastScrollY.current = window.scrollY;
  }, []);

  const handleLinkClick = () => {
    resetNavbarVisibility();
    setMobileOpen(false);
  };

  const handleMobileLinkClick = () => {
    resetNavbarVisibility();
    setMobileOpen(false);
    setOpenMobileSub(null);
  };

  const handleMouseEnter = (key) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenMenuKey(key);
    resetNavbarVisibility();
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenMenuKey(null);
    }, 150);
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      setMobileOpen(false);
      resetNavbarVisibility();
    }
  };

  const linkBase =
    "inline-flex items-center h-10 px-4 rounded-xl text-sm font-semibold transition-all duration-200 relative"; // Added 'relative'
  const linkIdle = "text-slate-700 hover:text-blue-700 hover:bg-blue-50/80";
  const linkActive = "text-blue-700 bg-blue-100/80 ring-2 ring-blue-200/50";

  const mobileLinkBase =
    "flex items-center w-full px-4 py-3 text-base font-medium transition-all duration-200 rounded-xl relative"; // Added 'relative'
  const mobileLinkIdle = "text-slate-700 hover:text-blue-700 hover:bg-blue-50";
  const mobileLinkActive = "text-blue-700 bg-blue-100 font-semibold";

  // 6. Helper to render the badge
  const Badge = ({ count }) => {
    if (!count || count <= 0) return null;
    return (
      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in duration-200">
        {count > 9 ? "9+" : count}
      </span>
    );
  };

  return (
    <>
      <div
        id="topNavBar"
        className={[
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out bg-white",
          hidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100",
          "navbar-opaque",
          scrolled ? "navbar-opaque-scrolled" : "",
        ].join(" ")}
        onMouseEnter={resetNavbarVisibility}
      >
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              to={
                user?.role === "student"
                  ? "/student-dashboard"
                  : "/admin/student-progress"
              }
              className="flex items-center gap-3 nav-link-hover"
              onClick={handleLinkClick}
            >
              <LogoFrame img={Logo} title="Plan It" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              <nav aria-label="Primary" className="flex items-center gap-1">
                {navItems.map((item, index) => {
                  const IconComponent = iconMap[item.title];
                  // 7. Check if this item is a chat item
                  const showBadge =
                    CHAT_NAV_TITLES.includes(item.title) && totalUnread > 0;

                  if (item.submenu) {
                    // ... (Submenu Logic - usually chat isn't a dropdown parent, but handled if needed)
                    // Existing submenu code...
                    const isAnySubItemActive = item.submenu.some(
                      (subItem) => location.pathname === subItem.path
                    );
                    const isOpen = openMenuKey === item.title;

                    return (
                      <div
                        key={item.title}
                        className="relative"
                        onMouseEnter={() => handleMouseEnter(item.title)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <button
                          type="button"
                          className={`${linkBase} ${
                            isAnySubItemActive ? linkActive : linkIdle
                          } nav-link-hover group`}
                          aria-haspopup="true"
                          aria-expanded={isOpen}
                          onClick={resetNavbarVisibility}
                        >
                          {IconComponent && (
                            <IconComponent className="mr-2 h-4 w-4" />
                          )}
                          <span>{item.title}</span>
                          <ChevronDown
                            className={`ml-2 h-4 w-4 transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />

                          {/* Badge on parent if needed (optional) */}
                          {showBadge && <Badge count={totalUnread} />}
                        </button>
                        {/* ... Submenu dropdown code ... */}
                        <div
                          className={`absolute top-full mt-2 min-w-[240px] rounded-2xl bg-white border border-slate-200/80 shadow-xl p-2 dropdown-animate ${
                            isOpen
                              ? "opacity-100 scale-100 pointer-events-auto"
                              : "opacity-0 scale-95 pointer-events-none"
                          } transition-all duration-200 origin-top-right ${
                            index === navItems.length - 1 ? "right-0" : "left-0"
                          }`}
                        >
                          {item.submenu.map((subItem) => {
                            const isActive = location.pathname === subItem.path;
                            return (
                              <Link
                                key={subItem.title}
                                to={subItem.path}
                                className={`flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                                  isActive
                                    ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                                onClick={handleLinkClick}
                              >
                                <span className="mr-2">•</span>
                                {subItem.title}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.title}
                      to={item.path}
                      className={`${linkBase} ${
                        isActive ? linkActive : linkIdle
                      } nav-link-hover`}
                      onClick={handleLinkClick}
                    >
                      {IconComponent && (
                        <IconComponent className="mr-2 h-4 w-4" />
                      )}
                      {item.title}

                      {/* 8. Render Badge on Desktop Link */}
                      {showBadge && <Badge count={totalUnread} />}
                    </Link>
                  );
                })}
              </nav>

              {/* Profile */}
              <div className="ml-4 pl-4 border-l border-slate-200/60">
                {/* ... existing profile code ... */}
                <Link
                  to={
                    user?.role === "student"
                      ? "/student-profile"
                      : "/admin/profile"
                  }
                  className="profile-icon inline-flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50/80 transition-all duration-200 group"
                  onClick={handleLinkClick}
                >
                  <div className="relative">
                    <UserCircle className="h-8 w-8 text-slate-700 group-hover:text-blue-700 transition-colors" />
                    <div className="absolute -inset-1 bg-blue-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 hidden sm:block">
                    Profile
                  </span>
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button - Add small dot if unread messages exist */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen((v) => !v);
                  resetNavbarVisibility();
                }}
                className="relative inline-flex items-center justify-center rounded-2xl p-2.5 hover:bg-slate-100/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {mobileOpen ? (
                  <X className="h-6 w-6 text-slate-700" />
                ) : (
                  <Menu className="h-6 w-6 text-slate-700" />
                )}

                {/* 9. Small indicator on the hamburger menu itself if unread */}
                {!mobileOpen && totalUnread > 0 && (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className={`lg:hidden fixed inset-0 transition-all duration-300 ${
            mobileOpen
              ? "bg-black/30 backdrop-blur-sm pointer-events-auto"
              : "bg-transparent pointer-events-none"
          }`}
        >
          <div
            id="mobile-menu"
            className={`absolute left-4 right-4 top-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xl overflow-hidden mobile-menu-animate ${
              mobileOpen
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 pointer-events-none"
            } transition-all duration-300 origin-top`}
          >
            <nav aria-label="Mobile Primary" className="flex flex-col p-4">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <LogoFrame img={Logo} title="Plan It" />
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const IconComponent = iconMap[item.title];
                  const showBadge =
                    CHAT_NAV_TITLES.includes(item.title) && totalUnread > 0;

                  if (!item.submenu) {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.title}
                        to={item.path}
                        className={`${mobileLinkBase} ${
                          isActive ? mobileLinkActive : mobileLinkIdle
                        } justify-between`}
                        onClick={handleMobileLinkClick}
                      >
                        <div className="flex items-center">
                          {IconComponent && (
                            <IconComponent className="mr-3 h-5 w-5" />
                          )}
                          {item.title}
                        </div>
                        {/* 10. Mobile Badge */}
                        {showBadge && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {totalUnread > 9 ? "9+" : totalUnread} New
                          </span>
                        )}
                      </Link>
                    );
                  }

                  // Mobile Submenu logic...
                  const isOpen = openMobileSub === item.title;
                  return (
                    <div key={item.title} className="space-y-1">
                      <button
                        onClick={() => {
                          setOpenMobileSub(isOpen ? null : item.title);
                          resetNavbarVisibility();
                        }}
                        className={`${mobileLinkBase} ${
                          isOpen ? mobileLinkActive : mobileLinkIdle
                        } justify-between`}
                      >
                        <div className="flex items-center">
                          {IconComponent && (
                            <IconComponent className="mr-3 h-5 w-5" />
                          )}
                          {item.title}
                        </div>
                        <div className="flex items-center gap-2">
                          {showBadge && (
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                          )}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>
                      {/* ... mobile submenu children ... */}
                      <div
                        className={`ml-8 space-y-1 overflow-hidden transition-all duration-300 ${
                          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        {item.submenu.map((subItem) => {
                          const isActive = location.pathname === subItem.path;
                          return (
                            <Link
                              key={subItem.title}
                              to={subItem.path}
                              className={`block px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                                isActive
                                  ? "bg-blue-50 text-blue-700 font-medium"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                              onClick={handleMobileLinkClick}
                            >
                              {subItem.title}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60">
                <Link
                  to={
                    user?.role === "student"
                      ? "/student-profile"
                      : "/admin/profile"
                  }
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 transition-colors group"
                  onClick={handleMobileLinkClick}
                >
                  <UserCircle className="h-6 w-6 text-slate-700 group-hover:text-blue-700" />
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    View Profile
                  </span>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </div>
      <div className="h-16" />
    </>
  );
};

export default TopNavBar;
