import React from 'react';
import { ResumeData } from '@/types';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/services/resumeService';

interface CorporateBlueTemplateProps {
  data: ResumeData;
  isDark: boolean;
}

const NAVY = '#1c4e82';
const NAVY_DARK = '#153f68';

export const CorporateBlueTemplate: React.FC<CorporateBlueTemplateProps> = ({ data, isDark }) => {
  const contentBg = isDark ? '#1e2530' : '#e7e9ec';
  const contentText = isDark ? '#e5e7eb' : '#1f2937';
  const mutedText = isDark ? '#9ca3af' : '#4b5563';
  // Coluna esquerda tem fundo branco fixo — texto sempre escuro, independente do tema
  const leftText = '#1f2937';
  const leftMuted = '#4b5563';

  return (
    <div className="w-full font-sans bg-white">
      {/* Header: foto + bloco azul corporativo */}
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-[38%] h-64 md:h-auto">
          <img src={data.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER} alt={data.fullName} className="w-full h-full object-cover object-top" />
        </div>
        <div
          className="relative w-full md:w-[62%] p-10 md:p-14 flex flex-col justify-center overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}
        >
          {/* Padrão decorativo: gráfico de candlestick */}
          <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 400 200">
            {Array.from({ length: 20 }).map((_, i) => {
              const x = i * 20 + 5;
              const h = 20 + ((i * 37) % 60);
              const y = 100 - h / 2 + ((i % 3) * 10 - 10);
              const up = i % 2 === 0;
              return (
                <g key={i}>
                  <line x1={x + 4} y1={y - 10} x2={x + 4} y2={y + h + 10} stroke="#ffffff" strokeWidth="1" />
                  <rect x={x} y={y} width="8" height={h} fill={up ? '#7ec8ff' : '#ffffff'} />
                </g>
              );
            })}
          </svg>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight uppercase tracking-tight">
              {data.fullName}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 font-semibold mt-2">{data.role}</p>
          </div>
        </div>
      </div>

      {/* Corpo: 60/40 */}
      <div className="grid grid-cols-1 md:grid-cols-5">
        {/* Esquerda 60% */}
        <div className="md:col-span-3 bg-white p-10 md:p-12 space-y-10">
          {data.summary && (
            <section>
              <div
                className="inline-flex items-center gap-2 text-white font-bold text-sm px-6 py-2 rounded-full mb-5"
                style={{ backgroundColor: NAVY }}
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                Quem sou
              </div>
              <p className="text-sm leading-relaxed" style={{ color: leftMuted }}>{data.summary}</p>
            </section>
          )}

          {data.education?.length > 0 && (
            <section>
              <div
                className="inline-flex items-center gap-2 text-white font-bold text-sm px-6 py-2 rounded-full mb-5"
                style={{ backgroundColor: NAVY }}
              >
                <span className="material-symbols-outlined text-[18px]">school</span>
                Educação
              </div>
              <div className="space-y-4">
                {data.education.map((edu) => (
                  <div key={edu.id}>
                    <p className="font-bold text-sm" style={{ color: NAVY }}>{edu.year}</p>
                    <p className="font-semibold text-sm" style={{ color: leftText }}>{edu.degree}</p>
                    <p className="text-xs" style={{ color: leftMuted }}>{edu.institution}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Direita 40% */}
        <div className="md:col-span-2 p-10 md:p-12 space-y-10" style={{ backgroundColor: contentBg }}>
          {data.experiences?.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-bold text-lg mb-5" style={{ color: contentText }}>
                <span className="material-symbols-outlined">work</span>
                Experiência
              </h2>
              <div className="space-y-6">
                {data.experiences.map((exp) => (
                  <div key={exp.id}>
                    <p className="font-bold text-xs" style={{ color: NAVY }}>{exp.period}</p>
                    <p className="font-semibold text-sm" style={{ color: contentText }}>{exp.role}</p>
                    <p className="text-xs leading-relaxed" style={{ color: mutedText }}>{exp.company} — {exp.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.skills?.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 font-bold text-lg mb-5" style={{ color: contentText }}>
                <span className="material-symbols-outlined">emoji_events</span>
                Habilidades
              </h2>
              <ul className="space-y-2">
                {data.skills.map((skill) => (
                  <li key={skill.id} className="text-sm flex justify-between" style={{ color: mutedText }}>
                    <span>{skill.name}</span>
                    <span className="font-bold" style={{ color: NAVY }}>{skill.level}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Rodapé contato */}
      <div
        className="flex flex-wrap items-center justify-center md:justify-between gap-4 px-10 py-6 text-white text-sm"
        style={{ backgroundColor: NAVY }}
      >
        <span className="flex items-center gap-2 font-bold uppercase tracking-wide">
          <span className="material-symbols-outlined">contact_phone</span> Contato
        </span>
        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">mail</span>{data.email}</span>
        <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">call</span>{data.phone}</span>
        {data.linkedin && <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">link</span>{data.linkedin}</span>}
      </div>
    </div>
  );
};

export default CorporateBlueTemplate;
