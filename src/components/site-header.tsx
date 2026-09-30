import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { useUser } from "@context/UserContext"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@components/ui/avatar"
import { CircleUserRoundIcon, BellIcon, LogOutIcon } from "lucide-react"
import { getInitials } from "../utils/formatters"
import { getLogoutReturnToUrl, getLoginPath } from "../utils/auth-sync"

interface SiteHeaderProps {
  title?: string;
}

export function SiteHeader({ title = "Overview" }: SiteHeaderProps) {
  const navigate = useNavigate();
  const { logout: auth0Logout } = useAuth0();
  const { profile, clearSession } = useUser();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const user = {
    name: profile?.name || "Member",
    email: profile?.email || "member@smarthire.com",
    avatar: profile?.picture || "",
  };



  const handleLogout = () => {
    clearSession();
    const returnTo = getLogoutReturnToUrl();
    window.history.replaceState(null, "", getLoginPath());
    auth0Logout({
      logoutParams: {
        returnTo,
      },
    });
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 sm:h-16 w-full min-w-0 shrink-0 items-center justify-between border-b border-[#E6E0D6] bg-cream/80 backdrop-blur-md px-3.5 sm:px-6 lg:pl-28 lg:pr-8">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <span className="font-serif text-base sm:text-lg font-bold text-charcoal tracking-tight truncate">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          aria-label="Notifications"
          className="flex size-8 sm:size-9 items-center justify-center rounded-full border border-[#E6E0D6] bg-white text-[#78716C] shadow-3xs transition-colors hover:border-terracotta/40 hover:text-charcoal hover:bg-cream cursor-pointer outline-none focus:outline-none shrink-0"
        >
          <BellIcon className="size-3.5 sm:size-4" />
        </button>

        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-85 cursor-pointer outline-none focus:outline-none shrink-0"
          >
            <Avatar className="size-8 sm:size-9 border border-[#E6E0D6] shadow-3xs shrink-0">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-white font-serif text-[11px] sm:text-xs font-bold text-charcoal">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 sm:w-64 rounded-xl border border-[#E6E0D6] bg-white p-2 shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 border-b border-[#E6E0D6]/60">
                <Avatar className="size-9 sm:size-10 border border-[#E6E0D6] shrink-0">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-cream font-serif text-xs font-bold text-charcoal">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-charcoal truncate font-serif">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-[#78716C] truncate">
                    {user.email}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/account");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-charcoal transition-colors hover:bg-cream hover:text-terracotta cursor-pointer"
                >
                  <CircleUserRoundIcon className="size-4 text-[#78716C]" />
                  <span>Account Profile</span>
                </button>
              </div>

              <div className="border-t border-[#E6E0D6]/60 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 cursor-pointer"
                >
                  <LogOutIcon className="size-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
