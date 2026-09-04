import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "@context/UserContext"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@components/ui/sidebar"
import {
  LayoutDashboard,
  Briefcase,
  Bookmark,
  FileCheck,
  UserCog,
  Users,
  Building2,
  ClipboardCheck,
} from "lucide-react"
import { SmartHireIcon } from "@components/smart-hire-logo"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function AppSidebar({ activeTab = "overview", onSelectTab, ...props }: AppSidebarProps) {
  const navigate = useNavigate();
  const { profile } = useUser();
  const currentRole = profile?.role || "candidate";

  const candidateItems = [
    {
      id: "overview",
      title: "Overview",
      icon: <LayoutDashboard className="size-5 lg:size-5.5 shrink-0" />,
    },
    {
      id: "jobs",
      title: "Browse Jobs",
      icon: <Briefcase className="size-5 lg:size-5.5 shrink-0" />,
    },
    {
      id: "saved-jobs",
      title: "Saved Jobs",
      icon: <Bookmark className="size-5 lg:size-5.5 shrink-0" />,
    },
    {
      id: "assessments",
      title: "Assessments",
      icon: <FileCheck className="size-5 lg:size-5.5 shrink-0" />,
    },
    {
      id: "profile",
      title: "Profile & Resume",
      icon: <UserCog className="size-5 lg:size-5.5 shrink-0" />,
    },
  ];

  const recruiterItems = [
    {
      id: "overview",
      title: "Overview",
      icon: <LayoutDashboard className="size-5 lg:size-5.5 shrink-0" />,
    },
    {
      id: "postings",
      title: "Job Postings",
      icon: <Briefcase className="size-5 lg:size-5.5 shrink-0" />,
    },
    {
      id: "candidates",
      title: "Candidates",
      icon: <Users className="size-5 lg:size-5.5 shrink-0" />,
    },
    {
      id: "assessments",
      title: "Assessments",
      icon: <ClipboardCheck className="size-5 lg:size-5.5 shrink-0" />,
    },
    {
      id: "company",
      title: "Company Profile",
      icon: <Building2 className="size-5 lg:size-5.5 shrink-0" />,
    },
  ];

  const navItems = currentRole === "recruiter" ? recruiterItems : candidateItems;

  const handleSelect = (tabId: string) => {
    if (onSelectTab) {
      onSelectTab(tabId);
    }
    if (currentRole === "recruiter") {
      if (tabId === "overview") navigate("/recruiter/dashboard");
      else if (tabId === "postings") navigate("/recruiter/jobs");
      else if (tabId === "candidates") navigate("/recruiter/candidates");
      else if (tabId === "assessments") navigate("/recruiter/assessments");
      else if (tabId === "company") navigate("/recruiter/company");
      else navigate(`/dashboard?tab=${tabId}`);
    } else {
      if (tabId === "overview") navigate("/candidate/dashboard");
      else if (tabId === "jobs") navigate("/candidate/jobs");
      else if (tabId === "saved-jobs") navigate("/candidate/saved-jobs");
      else if (tabId === "assessments") navigate("/candidate/assessments");
      else if (tabId === "profile") navigate("/candidate/profile");
      else navigate(`/dashboard?tab=${tabId}`);
    }
  };

  return (
    <Sidebar collapsible="none" className="w-14 sm:w-16 lg:w-20 border-none bg-cream shadow-none z-30 shrink-0" {...props}>
      <div className="flex flex-col items-center h-full bg-cream">
        <SidebarHeader className="h-14 sm:h-16 flex items-center justify-center p-0">
          <button
            type="button"
            onClick={() => handleSelect("overview")}
            className="flex size-10 sm:size-11 lg:size-12 shrink-0 items-center justify-center rounded-full bg-white border border-[#E6E0D6] shadow-2xs hover:border-terracotta/40 transition-colors cursor-pointer outline-none focus:outline-none"
            title="SmartHire Dashboard"
          >
            <SmartHireIcon className="size-6 sm:size-7 lg:size-8.5 shrink-0" />
          </button>
        </SidebarHeader>

        <SidebarContent className="flex flex-col items-center p-0 pt-3 sm:pt-5 overflow-visible">
          <div className="flex flex-col items-center gap-3.5 sm:gap-5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative size-10 sm:size-11 lg:size-12 flex items-center">
                  <button
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`group/nav absolute left-0 top-0 flex items-center h-10 sm:h-11 lg:h-12 rounded-full transition-all duration-300 ease-out cursor-pointer shadow-3xs outline-none focus:outline-none px-2.5 sm:px-3 hover:pr-5 ${
                      isActive
                        ? "w-10 sm:w-11 lg:w-max hover:w-max lg:pr-5 bg-terracotta text-white border border-terracotta shadow-2xs z-20"
                        : "w-10 sm:w-11 lg:w-12 hover:w-max bg-white text-[#78716C] border border-[#E6E0D6] hover:border-terracotta/40 hover:text-charcoal hover:bg-[#FAF8F5] z-10 hover:z-20"
                    }`}
                  >
                    <span className="flex size-5 sm:size-5.5 lg:size-6 shrink-0 items-center justify-center">
                      {item.icon}
                    </span>
                    <span
                      className={`transition-all duration-300 ease-out whitespace-nowrap overflow-hidden text-xs font-semibold tracking-tight ${
                        isActive
                          ? "max-w-0 opacity-0 group-hover/nav:max-w-xs group-hover/nav:opacity-100 group-hover/nav:ml-2.5 lg:max-w-xs lg:opacity-100 lg:ml-2.5"
                          : "max-w-0 opacity-0 group-hover/nav:max-w-xs group-hover/nav:opacity-100 group-hover/nav:ml-2.5"
                      }`}
                    >
                      {item.title}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
