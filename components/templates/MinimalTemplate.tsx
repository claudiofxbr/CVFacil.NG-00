import React from 'react';
import { ResumeData } from '@/types';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/services/resumeService';

interface MinimalTemplateProps {
  data: ResumeData;
  isDark: boolean;
}

export const MinimalTemplate: React.FC<MinimalTemplateProps> = ({ data, isDark }) => {
  const bgClass = isDark ? "bg-white text-stone-900" : "bg-slate-50 text-stone-800";
  const accentColor = "#64748b";
  const photoFrameStyle = "aspect-[3/4] object-cover object-top";

  return (
    <div className={`w-full font-sans p-12 md:p-16 ${bgClass}`}>
      <div className="max-w-4xl mx-auto space-y-20">
        {/* Header Minimal */}
        <header className="border-b-2 border-slate-300 pb-8">
          <div className="flex gap-12 items-start">
            <div className="w-32 flex-shrink-0">
              <img
                src={data.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER}
                alt={data.fullName}
                className={`w-full rounded-none shadow-sm ${photoFrameStyle}`}
              />
            </div>
            <div className="flex-1 pt-2">
              <h1 className="text-5xl font-light tracking-tight mb-4" style={{ color: accentColor }}>
                {data.fullName}
              </h1>
              <p className="text-2xl font-light text-stone-600 mb-8">{data.role}</p>
              <div className="space-y-2 text-sm text-stone-600">
                <div className="flex gap-4">
                  <span>📧 {data.email}</span>
                  <span>📱 {data.phone}</span>
                </div>
                <div className="flex gap-4">
                  <span>🔗 {data.linkedin}</span>
                  <span>🌐 {data.portfolio}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Summary */}
        {data.summary && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
              About
            </h2>
            <p className="text-base leading-relaxed text-stone-700">{data.summary}</p>
          </section>
        )}

        {/* Experience */}
        {data.experiences && data.experiences.length > 0 && (
          <section className="space-y-8">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
              Experience
            </h2>
            <div className="space-y-8">
              {data.experiences.map((exp) => (
                <div key={exp.id} className="space-y-2">
                  <div className="flex justify-between items-baseline gap-4">
                    <h3 className="text-lg font-semibold text-stone-900">{exp.role}</h3>
                    <p className="text-sm text-stone-500">{exp.period}</p>
                  </div>
                  <p className="text-sm text-stone-600">{exp.company}</p>
                  <p className="text-base text-stone-700 leading-relaxed">{exp.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
              Education
            </h2>
            <div className="space-y-6">
              {data.education.map((edu) => (
                <div key={edu.id} className="space-y-1">
                  <h3 className="text-base font-semibold text-stone-900">{edu.degree}</h3>
                  <p className="text-sm text-stone-600">{edu.institution}</p>
                  <p className="text-xs text-stone-500">{edu.year}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
              Skills
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {data.skills.map((skill) => (
                <div key={skill.id}>
                  <p className="text-sm font-medium text-stone-900">{skill.name}</p>
                  <div className="w-full bg-slate-200 h-1 mt-2 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${skill.level}%`, backgroundColor: accentColor }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Languages */}
        {data.languages && data.languages.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
              Languages
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {data.languages.map((lang) => (
                <div key={lang.id} className="text-stone-700">
                  {lang.name} <span className="text-stone-500">• {lang.level}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default MinimalTemplate;
