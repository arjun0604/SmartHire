export interface ApplicationSkillsProps {
  skills?: string[] | null;
}

export function ApplicationSkills({ skills }: ApplicationSkillsProps) {
  return (
    <section className="rounded-2xl border border-[#E6E0D6] bg-white p-6 sm:p-7 space-y-3.5 shadow-2xs">
      <div className="border-b border-[#F0ECE4] pb-2.5">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
          Candidate Skills
        </h3>
      </div>

      {skills && skills.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {skills.map((skill) => (
            <span
              key={skill}
              className="px-2.5 py-1 rounded-md bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-medium text-charcoal"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#8E877D] italic pt-1">
          No candidate skills listed.
        </p>
      )}
    </section>
  );
}
