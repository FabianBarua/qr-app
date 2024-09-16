import { createRoot } from 'react-dom/client'
import './index.css'
import { Route, Switch, useParams } from "wouter";
import App from './App';
import { Providers } from './components/Provider';

const links = [{
  id: "1",
  url: "https://www.google.com"
}, {
  id: "2",
  url: "https://www.facebook.com"
}, {
  id: "3",
  url: "https://www.twitter.com"
}];


// eslint-disable-next-line react-refresh/only-export-components
const ToRedirect = () => {

  const params = useParams();
  const { id } = params;

  if (!params || !id) return null;

  const urlSelected = links.find(link => link.id === id)?.url;

  window.location.href = urlSelected || "https://www.google.com";

}

createRoot(document.getElementById('root')!).render(
  <Providers>
    <Switch>
      <Route path="/:id" component={ToRedirect} />
      <Route>
        <App />
      </Route>
    </Switch>
  </Providers>
)

