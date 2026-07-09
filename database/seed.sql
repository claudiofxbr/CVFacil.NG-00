-- CVFacil.NG — Dados de Teste
-- Execute isto no Neon SQL Editor após executar schema.sql

-- Usuários de teste
INSERT INTO users (id, name, email, password_hash, role, plan, status, credits, avatar, created_at)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'João Silva',
    'joao@test.com',
    '$2b$12$3GczgOwV70YODlB8M8bFTuWsTTKB2nfQLMch3anWccupKfaiIfpPO',  -- senha: teste123
    'Usuário',
    'Padrão',
    'Ativo',
    6,
    'https://api.dicebear.com/7.x/initials/svg?seed=Joao%20Silva',
    NOW()
  ),
  (
    'b2c3d4e5-f6e7-8901-bcde-f12345678901',
    'Maria Admin',
    'admin@test.com',
    '$2b$12$3GczgOwV70YODlB8M8bFTuWsTTKB2nfQLMch3anWccupKfaiIfpPO',  -- senha: teste123
    'Administrador',
    'Premium',
    'Ativo',
    999,
    'https://api.dicebear.com/7.x/initials/svg?seed=Maria%20Admin',
    NOW()
  );

-- Currículos de teste
INSERT INTO resumes (
  id, user_id, template_id, theme_mode, full_name, role, email, phone,
  linkedin, portfolio, summary, experiences, education, skills, languages,
  hobbies, avatar_url, is_pinned, is_imported, created_at, last_updated
)
VALUES
  (
    'r1s2t3u4-v5w6-7890-rstu-v12345678901',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'original',
    'dark',
    'João Silva',
    'Desenvolvedor Full Stack',
    'joao@test.com',
    '(11) 98765-4321',
    'linkedin.com/in/joaosilva',
    'joaosilva.dev',
    'Desenvolvedor apaixonado por tecnologia com 5 anos de experiência em web development.',
    '[
      {
        "id": "exp1",
        "company": "Tech Startup XYZ",
        "role": "Senior Developer",
        "period": "2022 - Presente",
        "description": "Desenvolvimento de aplicações full-stack com React e Node.js"
      },
      {
        "id": "exp2",
        "company": "Agência Digital ABC",
        "role": "Developer",
        "period": "2020 - 2022",
        "description": "Criação de sites e aplicações web responsivas"
      }
    ]',
    '[
      {
        "id": "edu1",
        "institution": "Universidade Federal do Brasil",
        "degree": "Bacharelado em Ciência da Computação",
        "year": "2020",
        "type": "Bacharelado"
      }
    ]',
    '[
      {
        "id": "skill1",
        "name": "React",
        "level": 90
      },
      {
        "id": "skill2",
        "name": "Node.js",
        "level": 85
      },
      {
        "id": "skill3",
        "name": "TypeScript",
        "level": 80
      }
    ]',
    '[
      {
        "id": "lang1",
        "name": "Português",
        "level": "Nativo"
      },
      {
        "id": "lang2",
        "name": "Inglês",
        "level": "Fluente"
      }
    ]',
    '["Programação", "Design de UI/UX", "Jogos indie"]',
    'https://api.dicebear.com/7.x/initials/svg?seed=Joao%20Silva',
    true,
    false,
    NOW(),
    NOW()
  ),
  (
    'r2s3t4u5-v6w7-8901-stuv-w12345678902',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'tech',
    'dark',
    'João Silva - Tech',
    'Desenvolvedor Full Stack',
    'joao@test.com',
    '(11) 98765-4321',
    'linkedin.com/in/joaosilva',
    'joaosilva.dev',
    'Currículo em layout Tech moderno.',
    '[]',
    '[]',
    '[]',
    '[]',
    '[]',
    'https://api.dicebear.com/7.x/initials/svg?seed=Joao%20Silva',
    false,
    false,
    NOW(),
    NOW()
  );

SELECT 'Dados de teste inseridos com sucesso! ✅' as status;
