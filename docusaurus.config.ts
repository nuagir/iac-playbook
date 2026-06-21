import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "IaC Playbook",
  tagline: "Opiniated Infrastructure-as-Code playbook.",
  favicon: "img/favicon.svg",

  future: {
    v4: true,
  },

  url: "https://iacplaybook.com",
  baseUrl: "/",

  organizationName: "nuagir",
  projectName: "iac-playbook",

  onBrokenLinks: "throw",

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/",
          editUrl: "https://github.com/nuagir/iac-playbook/tree/main/",
          sidebarCollapsible: false,
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/docusaurus-social-card.jpg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "IaC Playbook",
      logo: {
        alt: "IaC Playbook Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          href: "https://github.com/nuagir/iac-playbook",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Terraform",
              to: "/terraform",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/nuagir/iac-playbook",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Nuagir`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
