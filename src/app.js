import { h, app } from "hyperapp"
import { location, Route, Link } from "@hyperapp/router"
import { getDirectory } from "./store"

const mainView = state => actions =>
  h('main', {class: 'container grid-lg'}, [
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
      h('h1', {}, 'Commit object CID: '+match.params.cid),
      TreeBreadcrumb({ matchUrl: match.url, pathArray: treePathArray }),
      TreeTable({ locationPathname: location.pathname, pathArray: treePathArray,
                  cid: match.params.cid }),
    ])
  );
}

function makeBreadcrumbsLinkData(pathArray) {
  let pathSegData = [];
  let parentPath = '';
  if (pathArray.length > 0) {
    pathSegData.push({ segment: '/' })
  }
  for (var i = 0; i < pathArray.length; i++) {
    const pathSeg = pathArray[i];
    pathSegData.push({ segment: pathSeg, pathToParent: parentPath });
    parentPath = parentPath+'/'+pathSeg;
  }
  return pathSegData;
}

const TreeBreadcrumb = ({ matchUrl, pathArray }) => {
  const pathSegData = makeBreadcrumbsLinkData(pathArray);
  // `matchUrl` = /tree/:cid, and each path segment's `pathToParent` field  = /some/path/here,
  //  where `pathToParent` = <empty string> for the first path segment
  return (
    h('nav', { 'aria-label': 'breadcrumb', role: 'navigation'},
      h('ol', { 'class': 'breadcrumb' },
        pathSegData
          .map((pathSeg, i) =>
            breadcrumbSegment({ pathSeg, matchUrl, isLast: i === pathSegData.length - 1}))))
  );
};

const breadcrumbSegment = ({pathSeg, matchUrl, isLast }) => {
  return (
    h('li', {'class': 'breadcrumb-item'},
      (isLast
       ? pathSeg.segment
       : (pathSeg.segment === '/'
         ? Link({ to: matchUrl },
                h('i', {class: 'link fa fa-home', 'aria-label': 'Home'}))
         : Link({ to: `${matchUrl}${pathSeg.pathToParent}/${pathSeg.segment}` },
                pathSeg.segment))))
  );
};

const TreeTable = ({ locationPathname, pathArray, cid }) => {
  const entries = getDirectory({ cid: cid, path: pathArray });
  const listItems = entries && entries.map(entry =>
    h('tr', {},
      h('td', {},
        (entry.isDir
         ? Link({ to: `${locationPathname}/${entry.name}` }, entry.name)
         : entry.name))));

  return (
    h('table', {class: 'table table-striped'},
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
