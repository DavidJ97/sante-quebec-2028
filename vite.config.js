import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relative : le site fonctionne aussi sur GitHub Pages, dans un sous-dossier
export default defineConfig({ plugins: [react()], base: './' });
