import React from 'react';
import { ResumeData } from '@/types';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/services/resumeService';

interface EngineerNavyTemplateProps {
  data: ResumeData;
  isDark: boolean;
}

const NAVY = '#1e3a5f';
const LIGHT_BLUE = '#a9c9de';

export const EngineerNavyTemplate: React.FC<EngineerNavyTemplateProps> = ({ data, isDark }) => {
  const mainBg = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#e5e7eb' : '#0f172a';
  const mutedText = isDark ? '#94a3b8' : '#475569';

  return (
    <div className="w-full font-sans flex flex-col md:flex-row" style={{ backgroundColor: mainBg }}>
      {/* Sidebar */}
      <aside className="w-full md:w-[30%] p-8 text-white space-y-8" style={{ backgroundColor: NAVY }}>
        <img
          src={data.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER}
          alt={data.fullName}
          className="w-full aspect-square object-cover object-top border-4 border-white"
        />

        <section>
          <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: LIGHT_BLUE }}>Contact</h3>
          <div className="space-y-3 text-xs">
            {data.portfolio && <div className="border-t border-white/20 pt-2">{data.portfolio}</div>}
            {data.phone && <div className="border-t border-white/20 pt-2">{data.phone}</div>}
            {data.email && <div className="border-t border-white/20 pt-2 break-all">{data.email}</div>}
          </div>
        </section>

        {data.education?.length > 0 && (
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: LIGHT_BLUE }}>Education</h3>
            <div className="space-y-3 text-xs">
              {data.education.map((edu) => (
                <div key={edu.id}>
                  <p className="font-bold">{edu.degree}</p>
                  <p className="opacity-80">{edu.institution}, {edu.year}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.skills?.length > 0 && (
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: LIGHT_BLUE }}>Skills</h3>
            <ul className="text-xs space-y-1.5 list-disc list-inside">
              {data.skills.map((s) => <li key={s.id}>{s.name}</li>)}
            </ul>
          </section>
        )}
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1">
        <div className="px-10 py-6" style={{ backgroundColor: LIGHT_BLUE }}>
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-widest" style={{ color: NAVY }}>
            {data.fullName}
          </h1>
        </div>
        <div className="px-10 py-4" style={{ backgroundColor: '#c9dbe9' }}>
          <p className="text-lg font-semibold uppercase tracking-wide" style={{ color: NAVY }}>{data.role}</p>
        </div>

        <div className="p-10 space-y-8">
          {data.summary && (
            <section>
              <h2 className="text-xl font-extrabold border-b-2 pb-2 mb-4" style={{ color: textColor, borderColor: NAVY }}>Profile</h2>
              <p className="text-sm leading-relaxed" style={{ color: mutedText }}>{data.summary}</p>
            </section>
          )}

          {data.experiences?.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold border-b-2 pb-2 mb-5" style={{ color: textColor, borderColor: NAVY }}>Work Experience</h2>
              <div className="space-y-6">
                {data.experiences.map((exp) => (
                  <div key={exp.id}>
                    <p className="font-bold text-base" style={{ color: textColor }}>{exp.role}</p>
                    <p className="text-sm font-semibold mb-2" style={{ color: NAVY }}>{exp.company}, {exp.period}</p>
                    <p className="text-sm leading-relaxed" style={{ color: mutedText }}>{exp.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default EngineerNavyTemplate;
