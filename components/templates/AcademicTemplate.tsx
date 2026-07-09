import React from 'react';
import { ResumeData } from '@/types';

interface AcademicTemplateProps {
  data: ResumeData;
  isDark: boolean;
}

export const AcademicTemplate: React.FC<AcademicTemplateProps> = ({ data, isDark }) => {
  const bgClass = isDark ? "bg-slate-900 text-slate-100" : "bg-white text-stone-900";
  const accentColor = "#0f172a";
  const borderColor = "#334155";
  const photoFrameStyle = "aspect-[3/4] object-cover object-top";

  return (
    <div className={`w-full font-serif p-12 md:p-16 ${bgClass}`}>
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header Formal */}
        <header className={`text-center border-b-4 border-${borderColor} pb-8`}>
          {data.avatarUrl && (
            <div className="w-24 h-32 mx-auto mb-6 flex-shrink-0">
              <img
                src={data.avatarUrl}
                alt={data.fullName}
                className={`w-full h-full object-cover object-top grayscale ${photoFrameStyle}`}
              />
            </div>
          )}
          <h1 className="text-4xl font-bold mb-2 uppercase tracking-wide" style={{ color: accentColor }}>
            {data.fullName}
          </h1>
          <p className="text-lg font-semibold text-slate-600 mb-6">{data.role}</p>
          <div className="text-sm space-y-1 text-slate-700">
            <div>{data.email} | {data.phone}</div>
            <div>{data.linkedin} | {data.portfolio}</div>
          </div>
        </header>

        {/* Professional Summary */}
        {data.summary && (
          <section>
            <h2
              className="text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b"
              style={{ color: accentColor, borderColor }}
            >
              Professional Summary
            </h2>
            <p className="text-justify leading-relaxed text-slate-700">{data.summary}</p>
          </section>
        )}

        {/* Professional Experience */}
        {data.experiences && data.experiences.length > 0 && (
          <section>
            <h2
              className="text-sm font-bold uppercase tracking-widest mb-6 pb-2 border-b"
              style={{ color: accentColor, borderColor }}
            >
              Professional Experience
            </h2>
            <div className="space-y-8">
              {data.experiences.map((exp) => (
                <div key={exp.id} className="ml-2">
                  <div className="flex justify-between mb-2">
                    <h3 className="text-base font-bold text-stone-900">{exp.role}</h3>
                    <p className="text-sm text-slate-600 italic">{exp.period}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">{exp.company}</p>
                  <p className="text-sm text-justify leading-relaxed text-slate-700">
                    {exp.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <section>
            <h2
              className="text-sm font-bold uppercase tracking-widest mb-6 pb-2 border-b"
              style={{ color: accentColor, borderColor }}
            >
              Education
            </h2>
            <div className="space-y-6">
              {data.education.map((edu) => (
                <div key={edu.id} className="ml-2">
                  <h3 className="text-base font-semibold text-stone-900">{edu.degree}</h3>
                  <p className="text-sm text-slate-700">{edu.institution}</p>
                  <p className="text-sm text-slate-600 italic">{edu.year}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills & Competencies */}
        {data.skills && data.skills.length > 0 && (
          <section>
            <h2
              className="text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b"
              style={{ color: accentColor, borderColor }}
            >
              Core Competencies
            </h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {data.skills.map((skill) => (
                <div key={skill.id} className="text-slate-700">
                  • {skill.name}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Languages */}
        {data.languages && data.languages.length > 0 && (
          <section>
            <h2
              className="text-sm font-bold uppercase tracking-widest mb-4 pb-2 border-b"
              style={{ color: accentColor, borderColor }}
            >
              Languages
            </h2>
            <div className="text-sm text-slate-700 space-y-1">
              {data.languages.map((lang) => (
                <div key={lang.id}>
                  {lang.name} ({lang.level})
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AcademicTemplate;
