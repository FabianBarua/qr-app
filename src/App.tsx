import { Route, Switch, useParams } from "wouter";

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

const App = () => (
  <div className="main">
    <Switch>
      <Route path="/:id" component={ToRedirect} />
      <Route>
        <h1>404 - Not Found</h1>
      </Route>
    </Switch>
  </div>
);

const ToRedirect = () => {

  const params = useParams();
  const { id } = params;

  if (!params || !id) return null;

  const urlSelected = links.find(link => link.id === id)?.url;

  window.location.href = urlSelected || "https://www.google.com";

}

export default App;