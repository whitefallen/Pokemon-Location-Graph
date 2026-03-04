import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@xyflow/react/dist/style.css';
import App from './App';
import './styles.css';

if (typeof window !== 'undefined') {
  const isFirefox = /firefox/i.test(window.navigator.userAgent);
  if (isFirefox) {
    document.documentElement.setAttribute('data-browser', 'firefox');
  }
}

const theme = createTheme({
  defaultRadius: 'lg',
  primaryColor: 'violet',
  radius: {
    xl: '18px'
  },
  shadows: {
    md: '0 10px 24px rgba(7, 9, 18, 0.26)',
    xl: '0 22px 46px rgba(5, 7, 16, 0.42)'
  },
  headings: {
    fontFamily: 'Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
  },
  fontFamily: 'Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  components: {
    Badge: {
      defaultProps: {
        radius: 'xl'
      }
    },
    Card: {
      defaultProps: {
        radius: 'xl',
        shadow: 'md'
      }
    },
    Paper: {
      defaultProps: {
        radius: 'xl',
        shadow: 'md'
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>
);