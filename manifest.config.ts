import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

/**
 * Manifest V3 definition.
 *
 * The extension is **side-panel only**: the toolbar action has no popup. The
 * background service worker enables `openPanelOnActionClick`, so clicking the
 * icon opens the side panel on whatever tab the user is on.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Social Post — AI Comments & Viral Posts for LinkedIn & X',
  version: pkg.version,
  description:
    'AI copilot for LinkedIn & X: find viral posts and generate posts, ideas & one-click comments. 100% local, bring your own key.',
  icons: {
    16: 'public/icons/icon-16.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png',
  },
  action: {
    default_title: 'Open Social Post — AI for LinkedIn & X',
    default_icon: {
      16: 'public/icons/icon-16.png',
      48: 'public/icons/icon-48.png',
      128: 'public/icons/icon-128.png',
    },
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        '*://*.linkedin.com/*',
        '*://*.x.com/*',
        '*://*.twitter.com/*',
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  // Minimal: only the side panel API needs a permission. Reading the active
  // tab's URL and messaging the content script are covered by host_permissions,
  // so no "tabs"/"activeTab"/"storage"/"scripting" warnings for users.
  permissions: ['sidePanel'],
  host_permissions: [
    // Read your feed + add the in-page comment button.
    '*://*.linkedin.com/*',
    '*://*.x.com/*',
    '*://*.twitter.com/*',
    // Call your chosen AI provider's API.
    'https://generativelanguage.googleapis.com/*',
    'https://api.openai.com/*',
    'https://api.anthropic.com/*',
    // Support self-hosted / local OpenAI-compatible endpoints you configure.
    'http://localhost/*',
    'http://127.0.0.1/*',
  ],
});
