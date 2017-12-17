import { h } from "hyperapp"
import { Route, Link } from "@hyperapp/router"
import { treePathEquals } from "./utils"
import Prism from "prismjs"
import "prismjs/themes/prism.css"
import "prismjs/components/prism-json"
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-typescript"

const ipgrvCommitHash = "z8mWaHXBDDx9acpiZWjgBDCBQx19my1LJ";
const hyperappCommitHash = "z8mWaGke4NCrkPUptjA2reLUkL1K8UT8z";

export const mainView = (state, actions) =>
  h('main', {class: 'container grid-lg'}, [
    Route({ path: '/', render: Home }),
    Route({
      path: '/tree/:cid',
      render: Filetree({ getTreePath: actions.tree.getPath,
                         treeState: state.tree }),
      parent: true,
    }),
    Route({
      path: '/blob/:cid',
      render: Blob({ getBlob: actions.blob.get, blobState: state.blob }),
      parent: true,
    }),
    Route({
      path: '/commits/:cid',
      render: CommitHistory({ getCommitsPage: actions.commits.getPage,
                              commitsState: state.commits }),
      parent: true,
    }),
  ]);

const Home = () =>
  h('ul', {}, [
    h('li', {}, Link({ to: `/tree/${ipgrvCommitHash}` }, 'ipgrv repo')),
    h('li', {}, Link({ to: `/tree/${hyperappCommitHash}` }, 'hyperapp repo')),
  ]);

const extractTreePathArray = (pathname, matchUrl) => {
  const treePath = (pathname.length === matchUrl.length
                    ? '/'
                    : pathname.substring(matchUrl.length));
  return pathToArray(treePath);
}

// Filetree is a route view, so props have to be passed in before.
const Filetree = ({getTreePath, treeState}) => ({ location, match }) => {
  const treePathArray = extractTreePathArray(location.pathname, match.url)

  /*
  const treePath = (location.pathname.length === match.url.length
                    ? '/'
                    : location.pathname.substring(match.url.length));
  const treePathArray = pathToArray(treePath);
  */

  function getCurrentTreePath() {
    getTreePath({ cid: match.params.cid, path: treePathArray });
  }

  // this seems ugly, because we have to calculate the true state, on the fly,
  // from the current, potentially invalid "state" and tree path browsed to by
  // the user. consequence of not being able to call `actions.tree.getPath`
  // before the route to update the state?
  let treeIsLoading = treeState.isLoading;
  if (match.params.cid !== treeState.commitCid
      || !treePathEquals(treePathArray, treeState.path)) {
    treeIsLoading = true;
  }
  return (
    h('div', {oncreate() { getCurrentTreePath() },
              onupdate() { getCurrentTreePath() }}, [
      h('h1', {}, 'Tree'),
      h('h2', {}, 'commit object CID: '+match.params.cid),
      h('p', {}, Link({ to: `/commits/${match.params.cid}` }, 'Commit history')),
      TreeBreadcrumb({ matchUrl: match.url, pathArray: treePathArray }),
      TreeTable({ locationPathname: location.pathname, pathArray: treePathArray,
                  cid: match.params.cid, treeEntries: treeState.entries,
                  treeIsLoading }),
    ])
  );
}

function getPrismLang(pathname) {
  const lastExt = pathname.lastIndexOf('.');
  const pathExt = pathname.substring(lastExt + 1);

  switch (pathExt) {
    case 'css':
      return Prism.languages.css;
      break;
    case 'html':
      return Prism.languages.html;
      break;
    case 'js':
      return Prism.languages.javascript;
      break;
    case 'json':
      return Prism.languages.json;
      break;
    case 'md':
    case 'markdown':
      return Prism.languages.markdown;
      break;
    case 'ts':
      return Prism.languages.typescript;
      break;
    default:
      return null;
  }
}

const Blob = ({getBlob, blobState}) => ({ location, match }) => {
  const treePathArray = extractTreePathArray(location.pathname, match.url)
  function getCurrentBlobPath() {
    getBlob({ cid: match.params.cid, path: treePathArray });
  }
  console.log(location.pathname);
  console.log("Prism languages = ", Prism.languages);
  let highlighted;
  if (blobState.data) {
    const lang = getPrismLang(location.pathname);
    if (lang) {
      highlighted = Prism.highlight(blobState.data, lang);
    }
  }
  return (
    h('div', {oncreate() { getCurrentBlobPath() },
              onupdate() { getCurrentBlobPath() }}, [
      h('h1', {}, 'Blob'),
      h('h2', {}, 'blob object CID: '+match.params.cid),
      TreeBreadcrumb({ matchUrl: match.url, pathArray: treePathArray }),
      h('pre', {innerHTML: highlighted}, !highlighted && blobState.data),
    ])
  );
};

const CommitHistory = ({getCommitsPage, commitsState}) => ({ location, match }) => {
  // get the page number from the url. This will become the new state
  const commitPagePath = (location.pathname.length === match.url.length
                          ? '/1'
                          : location.pathname.substring(match.url.length));
  const parsedCommitPage = parseInt(commitPagePath.substring(1));
  if (isNaN(parsedCommitPage)) {
    throw new Error("Invalid route, fix this later");
  }

  function getCurrentCommitPage() {
    getCommitsPage({ cid: match.params.cid, page: parsedCommitPage });
  }

  const commitListItems = commitsState.list.map(commit => {
    const authorCommitter =
      commit.author.email === commit.committer.email
        ? `by ${commit.author.name} <${commit.author.email}>`
        : `by ${commit.author.name} <${commit.author.email}> with ${commit.committer.name} <${commit.committer.email}>`;

    const parseCommitDateString = dateStr => {
      const unixTimestampStr =
        dateStr.indexOf(' ') !== -1
          ? dateStr.split(' ')[0]
          : /* not sure if this is even possible */ dateStr;

      // TODO: handle parse failure?
      return parseInt(unixTimestampStr);
    }
    const commitTimestamp = parseCommitDateString(commit.committer.date);
    const commitDate = new Date(commitTimestamp*1000);

    return (
      h('li', {class: 'commit-history-item'}, [
        h('pre', {}, commit.message),
        h('p', {}, `${authorCommitter} on ${commitDate.toLocaleString()}`),
      ])
    );
  });

  let pageIsLoading = commitsState.isLoading;
  if (match.params.cid !== commitsState.commitCid
      || commitsState.pageNumber !== parsedCommitPage) {
    pageIsLoading = true;
  }

  // oncreate and onupdate we need request commit history from the store
  // and update state.commits.list and state.commits.pageNumber

  return (
    h('div', {oncreate() { getCurrentCommitPage() },
              onupdate() { getCurrentCommitPage() }}, [
      h('h1', {}, 'Commits'),
      h('h2', {}, 'commit object CID: '+match.params.cid),
      !pageIsLoading && h('ol', {class: 'commit-history'}, commitListItems),
      !pageIsLoading && CommitHistoryNavBar({
        pageNumber: parsedCommitPage,
        isAnotherPage: commitsState.isAnotherPage,
        matchUrl: match.url
      }),
    ])
  );

};

const CommitHistoryNavBar = ({ matchUrl, pageNumber, isAnotherPage }) =>
  h('nav', {class: 'commit-history-nav'},
    h('ul', {}, [
      pageNumber === 1
        ? null
        : h('li', {},
            Link({to: `${matchUrl}/${pageNumber - 1}` }, 'Newer')),
      isAnotherPage
        ? h('li', {},
            Link({to: `${matchUrl}/${pageNumber + 1}` }, 'Older'))
        : null,
    ]))

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

const pathBlobToTree = path => path.replace(/^\/blob/, '/tree');
const pathTreeToBlob = path => path.replace(/^\/tree/, '/blob');

const breadcrumbSegment = ({pathSeg, matchUrl, isLast }) => {
  // replace a starting '/blob' with '/tree' so this component can be used in Blob
  const pathBase = pathBlobToTree(matchUrl);
  return (
    h('li', {'class': 'breadcrumb-item'},
      (isLast
       ? pathSeg.segment
       : (pathSeg.segment === '/'
          ? Link({ to: pathBase },
                 h('i', {class: 'fa fa-home', 'aria-label': 'Home'}))
          : Link({ to: `${pathBase}${pathSeg.pathToParent}/${pathSeg.segment}` },
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
      h('tr', {}, [
        h('td', {class: 'tree-entry-icon'},
          (entry.isDir
           ? h('i', {class: 'fa fa-folder'})
           : h('i', {class: 'fa fa-file-text-o'}))),
        h('td', {},
          (entry.isDir
           ? Link({ to: `${locationPathname}/${entry.name}` }, entry.name)
           : Link({ to: `${pathTreeToBlob(locationPathname)}/${entry.name}` },
                  entry.name))),
      ]));

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
    return path.replace(/^\//, '').replace(/\/$/, '').split('/');
  }
};
