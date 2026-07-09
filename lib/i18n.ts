/**
 * Sistema de Internacionalização (i18n) para CVFacil.NG
 * Suporte para: Português (BR), Inglês, Espanhol, Francês
 */

export type Language = 'pt-BR' | 'en' | 'es' | 'fr';

export const translations = {
  'pt-BR': {
    // General
    app_name: 'CVFacil.NG',
    language: 'Português (Brasil)',
    loading: 'Carregando...',
    saving: 'Salvando...',
    error: 'Erro',
    success: 'Sucesso',
    cancel: 'Cancelar',
    save: 'Salvar',
    delete: 'Excluir',
    edit: 'Editar',
    close: 'Fechar',
    copy: 'Copiar',
    share: 'Compartilhar',
    download: 'Baixar',

    // Navigation
    dashboard: 'Dashboard',
    settings: 'Configurações',
    pricing: 'Planos',
    admin: 'Administração',
    logout: 'Sair',
    login: 'Entrar',

    // Dashboard
    hello: 'Olá',
    welcome_back: 'Bem-vindo de volta ao CVFacil.NG',
    resumes_created: 'Currículos Criados',
    import_pdf: 'Importar PDF',
    new_resume: 'Novo Currículo',
    choose_template: 'Escolher Modelo',
    your_resumes: 'Seus Currículos',
    no_resumes: 'Nenhum currículo encontrado',
    start_now: 'Comece agora criando seu primeiro currículo profissional',
    create_first: 'Criar Primeiro Currículo',
    documents: 'Documentos',

    // Resume Sections
    full_name: 'Nome Completo',
    role: 'Cargo/Profissão',
    email: 'E-mail',
    phone: 'Telefone',
    linkedin: 'LinkedIn',
    portfolio: 'Portfólio',
    summary: 'Resumo Profissional',
    experience: 'Experiência Profissional',
    education: 'Educação',
    skills: 'Habilidades',
    languages: 'Idiomas',
    hobbies: 'Hobbies',

    // Actions
    duplicate: 'Duplicar',
    generate_link: 'Gerar Link',
    disable_sharing: 'Desativar Compartilhamento',
    view_public: 'Visualizar Público',
    print_pdf: 'Imprimir PDF',
    export_word: 'Exportar Word',
    export_html: 'Exportar HTML',

    // Messages
    duplicate_success: 'Currículo duplicado com sucesso!',
    share_generated: 'Link de compartilhamento gerado!',
    link_copied: 'Link copiado para a área de transferência!',
    share_tip: 'Qualquer pessoa com este link pode visualizar seu currículo',

    // AI Suggestions
    ai_suggestions: 'Sugestões IA',
    generate_suggestions: 'Gerar Sugestões',
    suggestion_click: 'Clique em uma sugestão para aplicar',
    fill_field_first: 'Preencha o campo antes de solicitar sugestões',

    // Settings
    language_setting: 'Idioma',
    theme_setting: 'Tema',
    dark_mode: 'Modo Escuro',
    light_mode: 'Modo Claro',
    account_settings: 'Configurações da Conta',
    update_profile: 'Atualizar Perfil',

    // Errors
    error_loading: 'Erro ao carregar',
    error_saving: 'Erro ao salvar',
    error_deleting: 'Erro ao excluir',
    error_network: 'Erro de conexão',
    error_auth: 'Não autenticado',

    // Templates
    template_original: 'Template Original',
    template_tech: 'Tech Dark Pro',
    template_timeline: 'Clean Timeline',
    template_creative: 'Creative Split',
    template_minimal: 'Minimalista',
    template_academic: 'Acadêmico',
    template_modern: 'Moderno',
  },

  'en': {
    // General
    app_name: 'CVFacil.NG',
    language: 'English',
    loading: 'Loading...',
    saving: 'Saving...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    copy: 'Copy',
    share: 'Share',
    download: 'Download',

    // Navigation
    dashboard: 'Dashboard',
    settings: 'Settings',
    pricing: 'Plans',
    admin: 'Administration',
    logout: 'Sign Out',
    login: 'Sign In',

    // Dashboard
    hello: 'Hello',
    welcome_back: 'Welcome back to CVFacil.NG',
    resumes_created: 'Resumes Created',
    import_pdf: 'Import PDF',
    new_resume: 'New Resume',
    choose_template: 'Choose Template',
    your_resumes: 'Your Resumes',
    no_resumes: 'No resumes found',
    start_now: 'Start now by creating your first professional resume',
    create_first: 'Create First Resume',
    documents: 'Documents',

    // Resume Sections
    full_name: 'Full Name',
    role: 'Job Title',
    email: 'Email',
    phone: 'Phone',
    linkedin: 'LinkedIn',
    portfolio: 'Portfolio',
    summary: 'Professional Summary',
    experience: 'Professional Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    hobbies: 'Hobbies',

    // Actions
    duplicate: 'Duplicate',
    generate_link: 'Generate Link',
    disable_sharing: 'Disable Sharing',
    view_public: 'View Public',
    print_pdf: 'Print PDF',
    export_word: 'Export Word',
    export_html: 'Export HTML',

    // Messages
    duplicate_success: 'Resume duplicated successfully!',
    share_generated: 'Share link generated!',
    link_copied: 'Link copied to clipboard!',
    share_tip: 'Anyone with this link can view your resume',

    // AI Suggestions
    ai_suggestions: 'AI Suggestions',
    generate_suggestions: 'Generate Suggestions',
    suggestion_click: 'Click on a suggestion to apply',
    fill_field_first: 'Fill in the field before requesting suggestions',

    // Settings
    language_setting: 'Language',
    theme_setting: 'Theme',
    dark_mode: 'Dark Mode',
    light_mode: 'Light Mode',
    account_settings: 'Account Settings',
    update_profile: 'Update Profile',

    // Errors
    error_loading: 'Error loading',
    error_saving: 'Error saving',
    error_deleting: 'Error deleting',
    error_network: 'Network error',
    error_auth: 'Not authenticated',

    // Templates
    template_original: 'Original Template',
    template_tech: 'Tech Dark Pro',
    template_timeline: 'Clean Timeline',
    template_creative: 'Creative Split',
    template_minimal: 'Minimal',
    template_academic: 'Academic',
    template_modern: 'Modern',
  },

  'es': {
    // General
    app_name: 'CVFacil.NG',
    language: 'Español',
    loading: 'Cargando...',
    saving: 'Guardando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    copy: 'Copiar',
    share: 'Compartir',
    download: 'Descargar',

    // Navigation
    dashboard: 'Panel de Control',
    settings: 'Configuración',
    pricing: 'Planes',
    admin: 'Administración',
    logout: 'Cerrar Sesión',
    login: 'Iniciar Sesión',

    // Dashboard
    hello: 'Hola',
    welcome_back: 'Bienvenido de vuelta a CVFacil.NG',
    resumes_created: 'Currículos Creados',
    import_pdf: 'Importar PDF',
    new_resume: 'Nuevo Currículo',
    choose_template: 'Elegir Plantilla',
    your_resumes: 'Tus Currículos',
    no_resumes: 'No se encontraron currículos',
    start_now: 'Comienza creando tu primer currículo profesional',
    create_first: 'Crear Primer Currículo',
    documents: 'Documentos',

    // Resume Sections
    full_name: 'Nombre Completo',
    role: 'Puesto de Trabajo',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    linkedin: 'LinkedIn',
    portfolio: 'Portafolio',
    summary: 'Resumen Profesional',
    experience: 'Experiencia Profesional',
    education: 'Educación',
    skills: 'Habilidades',
    languages: 'Idiomas',
    hobbies: 'Pasatiempos',

    // Actions
    duplicate: 'Duplicar',
    generate_link: 'Generar Enlace',
    disable_sharing: 'Desactivar Compartir',
    view_public: 'Ver Público',
    print_pdf: 'Imprimir PDF',
    export_word: 'Exportar Word',
    export_html: 'Exportar HTML',

    // Messages
    duplicate_success: '¡Currículo duplicado con éxito!',
    share_generated: '¡Enlace de compartir generado!',
    link_copied: '¡Enlace copiado al portapapeles!',
    share_tip: 'Cualquiera con este enlace puede ver tu currículo',

    // AI Suggestions
    ai_suggestions: 'Sugerencias IA',
    generate_suggestions: 'Generar Sugerencias',
    suggestion_click: 'Haz clic en una sugerencia para aplicar',
    fill_field_first: 'Rellena el campo antes de solicitar sugerencias',

    // Settings
    language_setting: 'Idioma',
    theme_setting: 'Tema',
    dark_mode: 'Modo Oscuro',
    light_mode: 'Modo Claro',
    account_settings: 'Configuración de Cuenta',
    update_profile: 'Actualizar Perfil',

    // Errors
    error_loading: 'Error al cargar',
    error_saving: 'Error al guardar',
    error_deleting: 'Error al eliminar',
    error_network: 'Error de red',
    error_auth: 'No autenticado',

    // Templates
    template_original: 'Plantilla Original',
    template_tech: 'Tech Dark Pro',
    template_timeline: 'Clean Timeline',
    template_creative: 'Creative Split',
    template_minimal: 'Minimalista',
    template_academic: 'Académico',
    template_modern: 'Moderno',
  },

  'fr': {
    // General
    app_name: 'CVFacil.NG',
    language: 'Français',
    loading: 'Chargement...',
    saving: 'Enregistrement...',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    copy: 'Copier',
    share: 'Partager',
    download: 'Télécharger',

    // Navigation
    dashboard: 'Tableau de Bord',
    settings: 'Paramètres',
    pricing: 'Plans',
    admin: 'Administration',
    logout: 'Se Déconnecter',
    login: 'Se Connecter',

    // Dashboard
    hello: 'Bonjour',
    welcome_back: 'Bienvenue sur CVFacil.NG',
    resumes_created: 'CV Créés',
    import_pdf: 'Importer PDF',
    new_resume: 'Nouveau CV',
    choose_template: 'Choisir un Modèle',
    your_resumes: 'Vos CV',
    no_resumes: 'Aucun CV trouvé',
    start_now: 'Commencez maintenant en créant votre premier CV professionnel',
    create_first: 'Créer Premier CV',
    documents: 'Documents',

    // Resume Sections
    full_name: 'Nom Complet',
    role: 'Titre du Poste',
    email: 'E-mail',
    phone: 'Téléphone',
    linkedin: 'LinkedIn',
    portfolio: 'Portfolio',
    summary: 'Résumé Professionnel',
    experience: 'Expérience Professionnelle',
    education: 'Éducation',
    skills: 'Compétences',
    languages: 'Langues',
    hobbies: 'Loisirs',

    // Actions
    duplicate: 'Dupliquer',
    generate_link: 'Générer le Lien',
    disable_sharing: 'Désactiver le Partage',
    view_public: 'Voir Public',
    print_pdf: 'Imprimer PDF',
    export_word: 'Exporter Word',
    export_html: 'Exporter HTML',

    // Messages
    duplicate_success: 'CV dupliqué avec succès!',
    share_generated: 'Lien de partage généré!',
    link_copied: 'Lien copié dans le presse-papiers!',
    share_tip: 'Toute personne ayant ce lien peut consulter votre CV',

    // AI Suggestions
    ai_suggestions: 'Suggestions IA',
    generate_suggestions: 'Générer les Suggestions',
    suggestion_click: 'Cliquez sur une suggestion pour l\'appliquer',
    fill_field_first: 'Remplissez le champ avant de demander des suggestions',

    // Settings
    language_setting: 'Langue',
    theme_setting: 'Thème',
    dark_mode: 'Mode Sombre',
    light_mode: 'Mode Clair',
    account_settings: 'Paramètres du Compte',
    update_profile: 'Mettre à Jour le Profil',

    // Errors
    error_loading: 'Erreur lors du chargement',
    error_saving: 'Erreur lors de l\'enregistrement',
    error_deleting: 'Erreur lors de la suppression',
    error_network: 'Erreur réseau',
    error_auth: 'Non authentifié',

    // Templates
    template_original: 'Modèle Original',
    template_tech: 'Tech Dark Pro',
    template_timeline: 'Clean Timeline',
    template_creative: 'Creative Split',
    template_minimal: 'Minimaliste',
    template_academic: 'Académique',
    template_modern: 'Moderne',
  },
};

// Hook para usar traduções
export const useTranslation = (language: Language = 'pt-BR') => {
  return (key: keyof typeof translations['pt-BR']): string => {
    return (translations[language] as any)?.[key] ?? (translations['pt-BR'] as any)[key] ?? key;
  };
};

export default translations;
