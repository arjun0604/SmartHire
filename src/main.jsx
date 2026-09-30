import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import 'rsuite/dist/rsuite-no-reset.min.css'
import './index.css'
import './App.css'
import App from './App.jsx'
import { Auth0Provider } from '@auth0/auth0-react'
import { UserProvider } from './context/UserContext'
const redirectUri = typeof window !== 'undefined'
  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? window.location.origin
      : `${window.location.origin}${import.meta.env.BASE_URL}`)
  : undefined;

const onRedirectCallback = (appState) => {
  const base = import.meta.env.BASE_URL || "/";
  const defaultTarget = new URL("dashboard", new URL(base, window.location.origin)).pathname;
  window.history.replaceState({}, document.title, appState?.returnTo || defaultTarget);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN}
        clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: redirectUri,
          audience: "https://api.smarthire.com",
          scope: "openid profile email offline_access",
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
        onRedirectCallback={onRedirectCallback}
      >
        <UserProvider>
          <App />
        </UserProvider>
      </Auth0Provider>
    </Provider>
  </StrictMode>,
)
