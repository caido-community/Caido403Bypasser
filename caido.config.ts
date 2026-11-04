import { defineConfig } from '@caido-community/dev';
import vue from '@vitejs/plugin-vue';
import tailwindcss from "tailwindcss";
// @ts-expect-error no declared types at this time
import tailwindPrimeui from "tailwindcss-primeui";
import tailwindCaido from "@caido/tailwindcss";
import path from "path";
import prefixwrap from "postcss-prefixwrap";

const id = "bypasser";
export default defineConfig({
  id,
  name: "403Bypasser",
  description: "Bypass 403 pages with a set of request-mutating templates",
  version: "2.0.0",
  author: {
    name: "bebiks",
    email: "lukasz@caido.io",
    url: "https://github.com/caido-community/Caido403Bypasser",
  },
  plugins: [
    {
      kind: "backend",
      id: "backend",
      root: "packages/backend",
    },
    {
      kind: 'frontend',
      id: "frontend",
      root: 'packages/frontend',
      backend: {
        id: "backend",
      },
      vite: {
        plugins: [vue()],
        build: {
          rollupOptions: {
            external: [
              '@caido/frontend-sdk', 
              "@codemirror/autocomplete", 
              "@codemirror/commands", 
              "@codemirror/language", 
              "@codemirror/lint", 
              "@codemirror/search", 
              "@codemirror/state", 
              "@codemirror/view", 
              "@lezer/common", 
              "@lezer/highlight", 
              "@lezer/lr",
              "vue",

            ]
          }
        },
        resolve: {
          alias: [
            {
              find: "@",
              replacement: path.resolve(__dirname, "packages/frontend/src"),
            },
          ],
        },
        css: {
          postcss: {
            plugins: [
              prefixwrap(`#plugin--${id}`),

              tailwindcss({
                corePlugins: {
                  preflight: false,
                },
                content: [
                  './packages/frontend/src/**/*.{vue,ts}',
                  './node_modules/@caido/primevue/dist/primevue.mjs'
                ],
                darkMode: ["selector", '[data-mode="dark"]'],
                plugins: [

                  tailwindPrimeui,

                  tailwindCaido,
                ],
              })
            ]
          }
        }
      }
    }
  ]
});