import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'PDJ PM',
  tagline: 'Dokumentasi Teknis & Operasional PT Pacific Data Jaya',
  favicon: 'img/favicon.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true,
    faster: true,
  },

  // Set the production url of your site here
  url: 'https://pm-qa-docs.vercel.app',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For Vercel Rewrites, we route it under /docs/
  baseUrl: '/docs/',
  trailingSlash: false,

  // GitHub pages deployment config.
  organizationName: 'pacific-data-jaya',
  projectName: 'pdj-pm-docs',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'id', // Default language is Indonesian
    locales: ['id'],
  },

  markdown: {
    mermaid: true, // Enable Mermaid diagrams
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'], // Enable Mermaid theme

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Serve docs directly at the root of /docs/
        },
        blog: false, // Disable blog feature
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark', // Default to dark mode for premium aesthetics
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'PDJ PM',
      logo: {
        alt: 'PT Pacific Data Jaya Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Dokumentasi',
        },
        {
          href: 'https://pm-qa-system.vercel.app',
          label: 'Aplikasi PDJ PM',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Navigasi',
          items: [
            {
              label: 'Dokumentasi Utama',
              to: '/',
            },
          ],
        },
        {
          title: 'Link Cepat',
          items: [
            {
              label: 'Aplikasi Produksi',
              href: 'https://pm-qa-system.vercel.app',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} PT Pacific Data Jaya. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
