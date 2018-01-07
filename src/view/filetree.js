import CID from "cids"
import { h } from "hyperapp"
import { Link } from "hyperapp-hash-router"
import marked from "marked"
import Prism from "prismjs"
import "prismjs/themes/prism.css"
import "prismjs/components/prism-json"
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-typescript"

import { treePathEquals, escapeHtml } from "../utils"

export const Blob = ({getBlob, blobState}) => ({ location, match }) => {
  const hashPath = location.hash.substring(2);
  const treePathArray = extractTreePathArray(hashPath, match.url)
  function getCurrentBlobPath() {
    getBlob({ cid: match.params.cid, path: treePathArray });
  }
  let highlighted;
  if (blobState.data) {
    const lang = getPrismLang(hashPath);
    if (lang) {
      highlighted = Prism.highlight(blobState.data, lang);
    }
  }
  return (
    h('div', {oncreate() { getCurrentBlobPath() },
              onupdate() { getCurrentBlobPath() }}, [
      h('h1', {class: 'f4'}, 'commit object CID: '+match.params.cid),
      TreeBreadcrumb({ matchUrl: match.url, pathArray: treePathArray }),
      !blobState.isLoading && blobState.data && h('pre',
        {innerHTML: highlighted || escapeHtml(blobState.data)}),
    ])
  );
};

export const Filetree = ({getTreePath, treeState}) => ({ location, match }) => {
  const hashPath = location.hash.substring(2);
  const treePathArray = extractTreePathArray(hashPath, match.url)

  function getCurrentTreePath() {
    getTreePath({ cid: match.params.cid, path: treePathArray });
  }

  const commitCid = new CID(match.params.cid);
  const commitMultihash = commitCid.buffer.slice(commitCid.prefix.length)
                                          .toString('hex');
  return (
    h('div', {oncreate() { getCurrentTreePath() },
              onupdate() { getCurrentTreePath() }}, [
      h('h1', {class: 'f4'}, 'commit object CID: '+match.params.cid),
      h('p', {}, Link({ to: `/commits/${match.params.cid}` }, 'Commit history')),
      h('p', {}, `To clone: git clone ipld::${commitMultihash}`),
      TreeBreadcrumb({ matchUrl: match.url, pathArray: treePathArray }),
      TreeTable({ locationPathname: hashPath, pathArray: treePathArray,
                  cid: match.params.cid, treeEntries: treeState.entries,
                  treeIsLoading: treeState.isLoading }),
      Readme({ readme: treeState.readme, isLoading: treeState.isLoading }),
    ])
  );
}

function pathToArray(path) {
  if (path[0] !== '/') {
    throw new Error('path must begin with "/"');
  }
  if (path === '/') {
    return [];
  } else {
    return path.replace(/^\//, '').replace(/\/$/, '').split('/');
  }
}

function extractTreePathArray(pathname, matchUrl) {
  const treePath = (pathname.length === matchUrl.length
                    ? '/'
                    : pathname.substring(matchUrl.length));
  return pathToArray(treePath);
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
      h('ol', {class: 'list pl0'},
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
    h('li', {class: 'breadcrumb-item dib'},
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
      h('tr', {class: 'striped--light-gray'}, [
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
    h('table', {class: 'collapse'}, tableBody)
  );
}

const Readme = ({ readme, isLoading }) => {
  return (
    !isLoading && readme.data && h('div', {},
      h('pre', { innerHTML: readme.isMarkdown
                             ? marked(readme.data)
                             : escapeHtml(readme.data) }))
  );
}
