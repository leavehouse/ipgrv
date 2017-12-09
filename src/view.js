import { h } from "hyperapp"
import { Route, Link } from "@hyperapp/router"
import { treePathEquals } from "./utils"

const ipgrvCommitHash = "z8mWaFkTJhSoyd4vfxprPSi8gwTgeEePb";
const hyperappCommitHash = "z8mWaGke4NCrkPUptjA2reLUkL1K8UT8z";

export const mainView = state => actions =>
  h('main', {class: 'container grid-lg'}, [
    Route({ path: '/', render: Home }),
    Route({
      path: '/tree/:cid',
      render: Filetree({getTreePath: actions.tree.getPath, treeState: state.tree }),
      parent: true
    }),
  ]);

const Home = () =>
  h('ul', {}, [
    h('li', {}, Link({ to: `/tree/${ipgrvCommitHash}` }, 'ipgrv repo')),
    h('li', {}, Link({ to: `/tree/${hyperappCommitHash}` }, 'hyperapp repo')),
  ]);

// Filetree is a route view, so props have to be passed in before.
const Filetree = ({getTreePath, treeState}) => ({ location, match }) => {
  const treePath = (location.pathname.length === match.url.length
                    ? '/'
                    : location.pathname.substring(match.url.length));

  const treePathArray = pathToArray(treePath);

  let treeEntries = treeState.entries;
  let treeIsLoading = treeState.isLoading;
  if (match.params.cid !== treeState.commitCid
      || !treePathEquals(treePathArray, treeState.path)) {
    treeIsLoading = true;
    treeEntries = [];
  }
  return (
    h('div', {oncreate() { getTreePath({ cid: match.params.cid, path: treePathArray }) },
              onupdate() { getTreePath({ cid: match.params.cid, path: treePathArray }) }}, [
      h('h1', {}, 'Commit object CID: '+match.params.cid),
      TreeBreadcrumb({ matchUrl: match.url, pathArray: treePathArray }),
      TreeTable({ locationPathname: location.pathname, pathArray: treePathArray,
                  cid: match.params.cid, treeEntries, treeIsLoading }),
    ])
  );
}

function makeBreadcrumbsLinkData(pathArray) {
  let segments = [];
  let parentPath = '';
  if (pathArray.length > 0) {
    segments.push({ segment: '/' })
  }
  //   segments[0].pathToParent = ''
  //   segments[1].pathToParent = '/' + pathArray[0]
  //
  // and in general:
  //
  //   segments[n].pathToParent = segments[n-1].pathToParent + '/' + pathArray[n-1]
  for (var i = 0; i < pathArray.length; i++) {
    const pathSeg = pathArray[i];
    segments.push({ segment: pathSeg, pathToParent: parentPath });
    parentPath = parentPath+'/'+pathSeg;
  }
  return segments;
}

const TreeBreadcrumb = ({ matchUrl, pathArray }) => {
  const pathSegData = makeBreadcrumbsLinkData(pathArray);
  // `matchUrl` = /tree/:cid,
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

// `locationPathname` is location.pathname, while `pathArray` is an array
// of path segments for a path *relative to the tree*. (i.e. when the former is
// '/tree/:cid/some/path/here', the latter is ['some', 'path', 'here'])
const TreeTable = ({ locationPathname, pathArray, cid, treeIsLoading, treeEntries}) => {
  let tableBody = null;
  if (!treeIsLoading) {
    const entries = treeEntries
    const listItems = entries && entries.map(entry =>
      h('tr', {},
        h('td', {},
          (entry.isDir
           ? Link({ to: `${locationPathname}/${entry.name}` }, entry.name)
           : entry.name))));

    tableBody = h('tbody', {}, listItems);
  }
  return (
    h('table', {class: 'table table-striped'}, tableBody)
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
