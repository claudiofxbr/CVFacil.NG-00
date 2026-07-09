import React from 'react';
import { ResumeData } from '@/types';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/services/resumeService';

interface FashionDarkRedTemplateProps {
  data: ResumeData;
  isDark: boolean;
}

const RED = '#ff3131';

export const FashionDarkRedTemplate: React.FC<FashionDarkRedTemplateProps> = ({ data, isDark }) => {
  const pageBg = isDark ? '#050505' : '#141014';
  const textColor = '#f5f5f5';
  const mutedText = '#b8b3b8';
  const [firstName, ...restName] = data.fullName.split(' ');
  const lastName = restName.join(' ') || firstName;

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-2xl font-black uppercase tracking-tight mb-3" style={{ color: textColor, fontStretch: 'condensed' }}>
      {children}
    </h2>
  );

  return (
    <div
      className="w-full font-sans p-10 md:p-14 relative overflow-hidden"
      style={{
        backgroundColor: pageBg,
        backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.04) 0%, transparent 40%), radial-gradient(circle at 85% 80%, rgba(255,49,49,0.06) 0%, transparent 45%)',
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-6 md:gap-10 items-start">
        {/* Foto */}
        <div className="relative">
          <img
            src={data.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER}
            alt={data.fullName}
            className="w-40 md:w-56 aspect-[3/4] object-cover object-top"
          />
          <div className="w-24 h-3 mt-2" style={{ backgroundColor: RED, opacity: 0.85 }} />
        </div>

        {/* Nome vertical rotacionado */}
        <div className="hidden md:flex items-stretch gap-4">
          <div className="w-1 self-stretch" style={{ backgroundColor: RED }} />
          <div
            className="font-black uppercase tracking-widest text-3xl leading-none flex flex-col justify-between"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            <span style={{ color: RED }}>{lastName}</span>
            <span style={{ color: textColor }}>{firstName}</span>
          </div>
        </div>

        {/* Título e contato */}
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase leading-tight" style={{ color: textColor }}>
            {data.role || 'Fashion Designer Professional'}
          </h1>
          <div className="mt-4 text-sm space-y-1" style={{ color: mutedText }}>
            {data.phone && <p>{data.phone}</p>}
            {data.email && <p>{data.email}</p>}
            {data.linkedin && <p>{data.linkedin}</p>}
          </div>
          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-0.5" style={{ backgroundColor: RED }} />
            <div
              className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
              style={{ border: `2px solid ${RED}` }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: RED }}>auto_awesome</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-10">
        {/* Coluna esquerda */}
        <div className="space-y-8">
          {data.education?.length > 0 && (
            <section>
              <SectionTitle>Education</SectionTitle>
              <div className="space-y-3 text-sm" style={{ color: mutedText }}>
                {data.education.map((edu) => (
                  <div key={edu.id}>
                    <p className="font-bold" style={{ color: textColor }}>{edu.year} • {edu.institution}</p>
                    <p>{edu.degree}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.skills?.length > 0 && (
            <section>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-1" style={{ color: textColor }}>Skill</h2>
              <div className="h-0.5 w-24 mb-3" style={{ backgroundColor: RED }} />
              <ul className="text-sm space-y-2" style={{ color: mutedText }}>
                {data.skills.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: RED }} />
                    {s.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.portfolio && (
            <div className="inline-block px-4 py-2 font-black text-sm" style={{ backgroundColor: RED, color: '#0d0d0d' }}>
              {data.portfolio}
            </div>
          )}
        </div>

        {/* Coluna direita: about + experience */}
        <div className="md:col-span-2 space-y-8">
          {data.summary && (
            <section>
              <SectionTitle>About Me</SectionTitle>
              <p className="text-sm leading-relaxed" style={{ color: mutedText }}>{data.summary}</p>
            </section>
          )}

          {data.experiences?.length > 0 && (
            <section>
              <SectionTitle>Experience</SectionTitle>
              <div className="space-y-5">
                {data.experiences.map((exp) => (
                  <div key={exp.id}>
                    <p className="font-bold text-sm" style={{ color: RED }}>
                      • {exp.role}
                    </p>
                    <p className="text-xs font-semibold mb-1" style={{ color: mutedText }}>{exp.company} | {exp.period}</p>
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

export default FashionDarkRedTemplate;
