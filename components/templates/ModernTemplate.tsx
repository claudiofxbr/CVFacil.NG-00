import React from 'react';
import { ResumeData } from '@/types';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/services/resumeService';

interface ModernTemplateProps {
  data: ResumeData;
  isDark: boolean;
}

export const ModernTemplate: React.FC<ModernTemplateProps> = ({ data, isDark }) => {
  const bgClass = isDark ? "bg-slate-900" : "bg-white";
  const textClass = isDark ? "text-slate-100" : "text-stone-900";
  const accentColor = "#ec4899";
  const secondaryColor = "#06b6d4";
  const photoFrameStyle = "aspect-[3/4] object-cover object-top";

  return (
    <div className={`w-full font-sans ${bgClass} ${textClass}`}>
      {/* Hero Header with Gradient */}
      <div
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, ${secondaryColor} 100%)`,
        }}
        className="p-12 md:p-16 text-white"
      >
        <div className="max-w-4xl mx-auto flex gap-12 items-center">
          <div className="w-40 flex-shrink-0">
            <img
              src={data.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER}
              alt={data.fullName}
              className={`w-full rounded-2xl shadow-2xl ${photoFrameStyle}`}
            />
          </div>
          <div className="flex-1">
            <h1 className="text-5xl font-bold mb-3 uppercase tracking-tight">
              {data.fullName}
            </h1>
            <p className="text-2xl font-light mb-6 opacity-90">{data.role}</p>
            <div className="space-y-2 text-sm">
              <div>📧 {data.email}</div>
              <div>📱 {data.phone}</div>
              <div>🔗 {data.linkedin} | 🌐 {data.portfolio}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-12 md:p-16">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Summary */}
          {data.summary && (
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: accentColor }}
                ></span>
                About Me
              </h2>
              <p className="text-lg leading-relaxed opacity-90">{data.summary}</p>
            </section>
          )}

          {/* Experience */}
          {data.experiences && data.experiences.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <span
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: secondaryColor }}
                ></span>
                Professional Experience
              </h2>
              <div className="space-y-10">
                {data.experiences.map((exp, idx) => (
                  <div key={exp.id} className="relative pl-8 pb-8">
                    {/* Timeline dot */}
                    <div
                      className="absolute left-0 top-0 w-4 h-4 rounded-full shadow-lg"
                      style={{ backgroundColor: accentColor }}
                    ></div>
                    {/* Connecting line */}
                    {idx < data.experiences.length - 1 && (
                      <div
                        className="absolute left-1.5 top-4 w-1 h-24"
                        style={{ backgroundColor: secondaryColor, opacity: 0.3 }}
                      ></div>
                    )}

                    <div>
                      <h3 className="text-xl font-bold mb-1">{exp.role}</h3>
                      <p
                        className="text-sm font-semibold mb-2"
                        style={{ color: accentColor }}
                      >
                        {exp.company}
                      </p>
                      <p className="text-xs opacity-70 mb-4">{exp.period}</p>
                      <p className="leading-relaxed opacity-90">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {data.education && data.education.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <span
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: accentColor }}
                ></span>
                Education
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.education.map((edu) => (
                  <div
                    key={edu.id}
                    className="p-6 rounded-xl"
                    style={{
                      background: isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(236,72,153,0.05)',
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    <h3 className="font-bold mb-2">{edu.degree}</h3>
                    <p className="text-sm opacity-75 mb-2">{edu.institution}</p>
                    <p className="text-xs opacity-60">{edu.year}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {data.skills && data.skills.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <span
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: secondaryColor }}
                ></span>
                Skills
              </h2>
              <div className="grid grid-cols-2 gap-6">
                {data.skills.map((skill) => (
                  <div key={skill.id}>
                    <div className="flex justify-between mb-2">
                      <p className="font-semibold">{skill.name}</p>
                      <p className="text-xs opacity-70">{skill.level}%</p>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden opacity-30">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${skill.level}%`,
                          background: `linear-gradient(90deg, ${accentColor}, ${secondaryColor})`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Languages */}
          {data.languages && data.languages.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: accentColor }}
                ></span>
                Languages
              </h2>
              <div className="flex flex-wrap gap-3">
                {data.languages.map((lang) => (
                  <div
                    key={lang.id}
                    className="px-4 py-2 rounded-full text-sm font-medium"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}20, ${secondaryColor}20)`,
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    {lang.name} • {lang.level}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="text-center py-8 text-sm opacity-50 border-t"
        style={{ borderColor: `${accentColor}20` }}
      >
        <p>
          Created with <span style={{ color: accentColor }}>❤</span> by CVFacil.NG
        </p>
      </div>
    </div>
  );
};

export default ModernTemplate;
