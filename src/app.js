import { h, app } from "hyperapp"
import { location, Route, Link } from "@hyperapp/router"
import { getDirectory } from "./store"

const mainView = state => actions =>
  h('main', {}, [
    Route({ path: '/', render: Home }),
    Route({ path: '/tree/:cid', render: Filetree, parent: true}),
  ]);

const demoCommitHash = "z8mWaFhg8TJBrcjq3FtHq92Y6TsqzhNs7";

const Home = () =>
  Link({ to: `/tree/${demoCommitHash}` }, 'Demo repo');

const Filetree = ({ location, match }) => {
  const treePath = (location.pathname.length === match.url.length
                    ? '/'
                    : location.pathname.substring(match.url.length));

  const treePathArray = pathToArray(treePath);
  return (
    h('div', {}, [
      TreeBreadcrumb({ pathArray: treePathArray }),
      TreeTable({ locationPathname: location.pathname, pathArray: treePathArray }),
    ])
  );
}

const TreeBreadcrumb = ({ pathArray }) =>
  h('nav', { 'aria-label': 'breadcrumb', role: 'navigation'},
    h('ol', {},
      pathArray
        .map(segment => ({ segment: segment, prefix: null }))
        .map(pathSeg => h('li', {}, pathSeg.segment))));

const TreeTable = ({ locationPathname, pathArray }) => {
  const entries = getDirectory({ path: pathArray });
  const listItems = entries && entries.map(entry =>
    h('tr', {},
      h('td', {},
        (entry.isDir
         ? Link({ to: `${locationPathname}/${entry.name}` }, entry.name)
         : entry.name))));

  return (
    h('table', {},
      h('tbody', {}, listItems))
  );
}

const pathToArray = path => {
  if (path[0] !== '/') {
    throw new Error('path must begin with "/"');
  }
  if (path === '/') {
    return [];
  } else {
    // trim leading and trailing slashes first
    return path.replace(/^\//, '').replace(/\/$/, '').split('/');
  }
};

const topics = {
  state: {
    location: location.state,
  },
  actions: {
    location: location.actions,
  },
  view: mainView,
};

const actions = app(topics);
const unsubscribe = location.subscribe(actions.location);
