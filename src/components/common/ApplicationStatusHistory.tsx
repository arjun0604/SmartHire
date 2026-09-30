import type { ApplicationStatusHistory } from "../../store/slices/applicationsSlice"
import {
  formatDateTime,
  getHistoryActor,
  getApplicationStatusBadgeClass,
} from "../../utils/formatters"

export interface ApplicationStatusHistoryProps {
  statusHistory: ApplicationStatusHistory[];
}

export function ApplicationStatusHistorySection({
  statusHistory,
}: ApplicationStatusHistoryProps) {
  return (
    <section className="rounded-2xl border border-[#E6E0D6] bg-white p-6 sm:p-7 space-y-4 shadow-2xs">
      <div className="border-b border-[#F0ECE4] pb-2.5">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
          Recruitment Status History
        </h3>
        <p className="text-[11px] text-[#8E877D] mt-0.5">
          Chronological audit log of recruitment stage transitions for this application.
        </p>
      </div>

      {statusHistory.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[#E6E0D6]">
          <table className="w-full text-left text-xs divide-y divide-[#E6E0D6]">
            <thead className="bg-[#FAF8F5] font-mono text-[11px] uppercase tracking-wider text-[#78716C]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Previous Status</th>
                <th className="py-2.5 px-4 font-semibold">New Status</th>
                <th className="py-2.5 px-4 font-semibold">Changed Date &amp; Time</th>
                <th className="py-2.5 px-4 font-semibold">Actor</th>
                <th className="py-2.5 px-4 font-semibold">Reason / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE4] bg-white">
              {statusHistory.map((item, idx) => {
                const actor = getHistoryActor(item);
                return (
                  <tr key={idx} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.from_status ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${getApplicationStatusBadgeClass(
                            item.from_status
                          )}`}
                        >
                          {item.from_status}
                        </span>
                      ) : (
                        <span className="text-[#8E877D] font-medium">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${getApplicationStatusBadgeClass(
                          item.to_status
                        )}`}
                      >
                        {item.to_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#44403C] font-mono text-[11px]">
                      {formatDateTime(item.changed_at)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-charcoal font-medium">
                      {actor}
                    </td>
                    <td className="py-3 px-4 text-[#44403C] max-w-xs truncate">
                      {item.reason ? (
                        <span title={item.reason} className="text-rose-700 font-medium">
                          {item.reason}
                        </span>
                      ) : (
                        <span className="text-[#A8A199]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-[#8E877D] italic">
          No recruitment status history recorded.
        </p>
      )}
    </section>
  );
}
