import { useEffect } from "react"
import { useAppSelector } from "../../store"
import type { Application } from "../../store/slices/applicationsSlice"
import type { Job } from "../../data/jobs"
import { CandidateApplicationView } from "./CandidateApplicationView"

interface ApplicationDetailModalProps {
  isOpen?: boolean;
  onClose: () => void;
  application: Application | null;
  job?: Job | null;
}

export function ApplicationDetailModal({
  isOpen,
  onClose,
  application,
  job: propJob,
}: ApplicationDetailModalProps) {
  const actuallyOpen = isOpen ?? Boolean(application);
  const { jobs } = useAppSelector((state) => state.jobs);
  const currentJob = propJob || (application ? jobs.find((j) => j.id === application.job_id) : null);

  useEffect(() => {
    if (actuallyOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [actuallyOpen]);

  if (!actuallyOpen || !application) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal/55 backdrop-blur-xs overflow-hidden animate-in fade-in duration-200">
      <CandidateApplicationView
        application={application}
        job={currentJob}
        onClose={onClose}
      />
    </div>
  );
}
