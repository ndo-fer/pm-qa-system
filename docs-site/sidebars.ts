import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'overview',
    {
      type: 'category',
      label: '🚀 Memulai (Getting Started)',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/seeding',
        'getting-started/credentials',
      ],
    },
    {
      type: 'category',
      label: '🏗️ Arsitektur Sistem',
      collapsed: true,
      items: [
        'architecture/database-schema',
        'architecture/data-sync',
      ],
    },
    {
      type: 'category',
      label: '💻 Panduan Modul Aplikasi',
      collapsed: false,
      items: [
        'modules/task-management',
        'modules/s-curve',
        'modules/qa-console',
        'modules/whatsapp-bot',
      ],
    },
    {
      type: 'category',
      label: '🧪 Otomasi & E2E Testing',
      collapsed: true,
      items: [
        'automation/local-e2e',
        'automation/staging-portal',
      ],
    },
  ],
};

export default sidebars;
