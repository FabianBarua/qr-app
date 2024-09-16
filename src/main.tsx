import { createRoot } from 'react-dom/client'
import './index.css'
import { Route, Switch } from "wouter";
import App from './App';
import { Providers } from './components/Provider';

createRoot(document.getElementById('root')!).render(
  <Providers>
    <Switch>
      <Route path="/:id" component={App} />
      <Route>
        <App />
      </Route>
    </Switch>
  </Providers>
)

