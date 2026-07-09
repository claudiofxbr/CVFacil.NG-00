import React from 'react';
import { ResumeData } from '@/types';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/services/resumeService';

interface GrungeGrayTemplateProps {
  data: ResumeData;
  isDark: boolean;
}

export const GrungeGrayTemplate: React.FC<GrungeGrayTemplateProps> = ({ data, isDark }) => {
  const pageBg = isDark ? '#2b2b2b' : '#d9d9d7';
  const textColor = isDark ? '#f4f4f4' : '#111111';
  const mutedText = isDark ? '#c4c4c4' : '#4b4b4b';
  const [firstName, ...restName] = data.fullName.split(' ');

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2
      className="text-lg font-extrabold uppercase tracking-wide border-b-2 pb-2 mb-4"
      style={{ color: textColor, borderColor: textColor }}
    >
      {children}
    </h2>
  );

  return (
    <div
      className="w-full font-sans p-10 md:p-14 relative overflow-hidden"
      style={{
        backgroundColor: pageBg,
        backgroundImage:
          'radial-gradient(circle at 20% 30%, rgba(0,0,0,0.05) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.06) 0%, transparent 45%), radial-gradient(circle at 60% 10%, rgba(255,255,255,0.15) 0%, transparent 35%)',
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
        {/* Coluna esquerda: nome, contato, foto, cargo */}
        <div className="flex flex-col justify-between">
          <div>
            <h1 className="text-6xl md:text-7xl font-black uppercase leading-[0.9] tracking-tight" style={{ color: textColor }}>
              {firstName}<br />{restName.join(' ')}
            </h1>
            <div className="mt-6 text-sm space-y-1" style={{ color: mutedText }}>
              {data.portfolio && <p>{data.portfolio}</p>}
              {data.email && <p>{data.email}</p>}
              {data.phone && <p>{data.phone}</p>}
            </div>
          </div>

          <div className="mt-10">
            <img
              src={data.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER}
              alt={data.fullName}
              className="w-full max-w-xs aspect-[4/5] object-cover object-top"
              style={{ filter: 'grayscale(100%)' }}
            />
          </div>

          <h2 className="text-4xl md:text-5xl font-black uppercase leading-tight mt-8" style={{ color: textColor }}>
            {data.role}
          </h2>
        </div>

        {/* Coluna direita: conteúdo */}
        <div className="space-y-10">
          {data.summary && (
            <section>
              <SectionTitle>Perfil</SectionTitle>
              <p className="text-sm leading-relaxed" style={{ color: mutedText }}>{data.summary}</p>
            </section>
          )}

          {data.education?.length > 0 && (
            <section>
              <SectionTitle>Educação</SectionTitle>
              <div className="space-y-3">
                {data.education.map((edu) => (
                  <div key={edu.id} className="text-sm" style={{ color: mutedText }}>
                    <span className="font-bold" style={{ color: textColor }}>{edu.year}</span>
                    {' — '}
                    <span className="font-bold" style={{ color: textColor }}>{edu.institution}</span>
                    <br />{edu.degree}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.experiences?.length > 0 && (
            <section>
              <SectionTitle>Experiências</SectionTitle>
              <div className="space-y-4">
                {data.experiences.map((exp) => (
                  <div key={exp.id} className="text-sm" style={{ color: mutedText }}>
                    <span className="font-bold" style={{ color: textColor }}>{exp.period}</span>
                    <br />
                    <span className="font-bold" style={{ color: textColor }}>{exp.role}</span>
                    {' — '}{exp.company}
                    <br />{exp.description}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.skills?.length > 0 && (
            <section>
              <SectionTitle>Habilidades</SectionTitle>
              <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: mutedText }}>
                {data.skills.map((s) => <li key={s.id}>{s.name}</li>)}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default GrungeGrayTemplate;
