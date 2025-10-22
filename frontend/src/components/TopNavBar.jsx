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
import { useEffect, useState, useRef } from "react";

// Icon mapping for menu items
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

const TopNavBar = () => {
  const { user } = useAuth();
  const navItems =
    user?.role === "student" ? STUDENT_NAV_ITEMS : ADMIN_NAV_ITEMS;
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMobileSub, setOpenMobileSub] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const overlayRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setOpenMobileSub(null);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [mobileOpen]);

  // Handle dropdown hover with delay
  const handleMouseEnter = (key) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenMenuKey(key);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenMenuKey(null);
    }, 150);
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) setMobileOpen(false);
  };

  // Enhanced styling variables
  const linkBase =
    "inline-flex items-center h-10 px-4 rounded-xl text-sm font-semibold transition-all duration-200";
  const linkIdle = "text-slate-700 hover:text-blue-700 hover:bg-blue-50/80";
  const linkActive = "text-blue-700 bg-blue-100/80 ring-2 ring-blue-200/50";

  const mobileLinkBase =
    "flex items-center w-full px-4 py-3 text-base font-medium transition-all duration-200 rounded-xl";
  const mobileLinkIdle = "text-slate-700 hover:text-blue-700 hover:bg-blue-50";
  const mobileLinkActive = "text-blue-700 bg-blue-100 font-semibold";

  return (
    <div
      id="topNavBar"
      className={`sticky top-0 z-50 navbar-transition ${
        scrolled ? "navbar-glass-scrolled" : "navbar-glass"
      }`}
    >
      {/* Main navigation bar */}
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
          >
            <LogoFrame img={Logo} title="Plan It" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            <nav aria-label="Primary" className="flex items-center gap-1">
              {navItems.map((item, index) => {
                const IconComponent = iconMap[item.title];

                if (item.submenu) {
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
                      </button>

                      {/* Enhanced Dropdown */}
                      <div
                        className={`absolute top-full mt-2 min-w-[240px] rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-xl p-2 dropdown-animate ${
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

                // Single link item
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.title}
                    to={item.path}
                    className={`${linkBase} ${
                      isActive ? linkActive : linkIdle
                    } nav-link-hover`}
                  >
                    {IconComponent && (
                      <IconComponent className="mr-2 h-4 w-4" />
                    )}
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* Profile Section with enhanced styling */}
            <div className="ml-4 pl-4 border-l border-slate-200/60">
              <Link
                to={
                  user?.role === "student"
                    ? "/student-profile"
                    : "/admin/profile"
                }
                className="profile-icon inline-flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50/80 transition-all duration-200 group"
                aria-label="Profile"
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

          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-controls="mobile-menu"
              aria-expanded={mobileOpen}
              className="inline-flex items-center justify-center rounded-2xl p-2.5 hover:bg-slate-100/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {mobileOpen ? (
                <X className="h-6 w-6 text-slate-700" />
              ) : (
                <Menu className="h-6 w-6 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile Menu */}
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
          className={`absolute left-4 right-4 top-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl overflow-hidden mobile-menu-animate ${
            mobileOpen
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          } transition-all duration-300 origin-top`}
        >
          <nav aria-label="Mobile Primary" className="flex flex-col p-4">
            {/* Close button header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/60">
              <div className="flex items-center gap-3">
                <LogoFrame img={Logo} title="Plan It" />
                <span className="text-lg font-bold text-blue-900">Plan It</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            {/* Navigation Items */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const IconComponent = iconMap[item.title];

                if (!item.submenu) {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.title}
                      to={item.path}
                      className={`${mobileLinkBase} ${
                        isActive ? mobileLinkActive : mobileLinkIdle
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {IconComponent && (
                        <IconComponent className="mr-3 h-5 w-5" />
                      )}
                      {item.title}
                    </Link>
                  );
                }

                // Mobile submenu section
                const isOpen = openMobileSub === item.title;
                return (
                  <div key={item.title} className="space-y-1">
                    <button
                      onClick={() =>
                        setOpenMobileSub(isOpen ? null : item.title)
                      }
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
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

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
                            onClick={() => setMobileOpen(false)}
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

            {/* Mobile Profile Link */}
            <div className="mt-6 pt-4 border-t border-slate-200/60">
              <Link
                to={
                  user?.role === "student"
                    ? "/student-profile"
                    : "/admin/profile"
                }
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 transition-colors group"
                onClick={() => setMobileOpen(false)}
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
  );
};

export default TopNavBar;
