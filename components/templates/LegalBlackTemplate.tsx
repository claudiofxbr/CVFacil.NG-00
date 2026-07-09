import React from 'react';
import { ResumeData } from '@/types';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/services/resumeService';

interface LegalBlackTemplateProps {
  data: ResumeData;
  isDark: boolean;
}

const BLACK = '#111111';

export const LegalBlackTemplate: React.FC<LegalBlackTemplateProps> = ({ data, isDark }) => {
  const pageBg = isDark ? '#18181b' : '#ffffff';
  const textColor = isDark ? '#e5e7eb' : '#1f2937';
  const mutedText = isDark ? '#9ca3af' : '#6b7280';
  const [firstName, ...restName] = data.fullName.split(' ');

  const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="inline-block text-white font-bold text-lg px-6 py-2 rounded-full mb-6" style={{ backgroundColor: BLACK }}>
      {children}
    </div>
  );

  const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="text-white text-xs font-bold px-3 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: BLACK }}>
      {children}
    </span>
  );

  return (
    <div className="w-full font-sans p-10 md:p-14" style={{ backgroundColor: pageBg }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Coluna esquerda */}
        <div className="md:col-span-1 space-y-6">
          <img
            src={data.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER}
            alt={data.fullName}
            className="w-full aspect-[4/3] object-cover object-top rounded-2xl"
          />

          <div className="rounded-2xl p-6 text-white space-y-4" style={{ backgroundColor: BLACK }}>
            <h3 className="text-xl font-extrabold">Contato</h3>
            <div className="text-sm space-y-2">
              {data.phone && <p><span className="font-bold">Celular </span>{data.phone}</p>}
              {data.email && <p><span className="font-bold">Email </span>{data.email}</p>}
              {data.portfolio && <p><span className="font-bold">Site </span>{data.portfolio}</p>}
            </div>
          </div>

          {data.languages?.length > 0 && (
            <div className="rounded-2xl p-6 text-white space-y-3" style={{ backgroundColor: BLACK }}>
              <h3 className="text-xl font-extrabold mb-2">Idiomas</h3>
              {data.languages.map((lang) => (
                <div key={lang.id} className="flex items-center justify-between text-sm">
                  <span>{lang.name} <b>{lang.level}</b></span>
                </div>
              ))}
            </div>
          )}

          {data.hobbies?.length > 0 && (
            <div className="rounded-2xl p-6 text-white space-y-2" style={{ backgroundColor: BLACK }}>
              <h3 className="text-xl font-extrabold mb-2">Competências</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {data.hobbies.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="md:col-span-2 space-y-8">
          <div className="flex justify-end">
            <div className="text-white text-right px-8 py-5 rounded-b-3xl" style={{ backgroundColor: BLACK }}>
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
                {firstName}<br />{restName.join(' ')}
              </h1>
            </div>
          </div>

          {data.summary && (
            <div>
              <p className="font-bold text-sm" style={{ color: textColor }}>
                <span className="font-extrabold">Perfil</span> | {data.summary}
              </p>
            </div>
          )}

          {data.education?.length > 0 && (
            <section>
              <Pill>Formação</Pill>
              <div className="space-y-5">
                {data.education.map((edu) => (
                  <div key={edu.id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-base" style={{ color: textColor }}>{edu.degree}</p>
                      <p className="text-sm" style={{ color: mutedText }}>{edu.institution}</p>
                    </div>
                    <Badge>{edu.year}</Badge>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.experiences?.length > 0 && (
            <section>
              <Pill>Experiência</Pill>
              <div className="space-y-5">
                {data.experiences.map((exp) => (
                  <div key={exp.id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-base" style={{ color: textColor }}>{exp.role}</p>
                      <p className="text-sm" style={{ color: mutedText }}>{exp.company}</p>
                    </div>
                    <Badge>{exp.period}</Badge>
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

export default LegalBlackTemplate;
