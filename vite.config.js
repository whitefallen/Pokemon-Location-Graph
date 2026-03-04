import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.indexOf('node_modules') >= 0) {
                        if (id.indexOf('@xyflow') >= 0 || id.indexOf('dagre') >= 0) {
                            return 'graph-vendor';
                        }
                        if (id.indexOf('@mantine') >= 0 || id.indexOf('@tabler') >= 0) {
                            return 'ui-vendor';
                        }
                        return undefined;
                    }
                    return undefined;
                }
            }
        }
    }
});
