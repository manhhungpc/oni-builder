import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [svelte(), tailwindcss()],
    server: {
        port: 5170,
        host: true, // Listen on all addresses, including LAN and Docker
    },
    resolve: {
        alias: {
            "@shared": path.resolve(__dirname, "../shared"),
            "src": path.resolve(__dirname, "./src"),
            "$lib": path.resolve(__dirname, "./src/lib"),
        },
    },
});
