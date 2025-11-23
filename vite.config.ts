import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// Environment variables configuration
	// VITE_* prefixed variables are automatically exposed to client-side code
	define: {
		__DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
	}
});
