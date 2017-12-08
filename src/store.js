/* operations for interacting with the...store? model?
 *  - initial one where we get the entire filetree, possibly sans leaves
 *     - though maybe see the git bomb article, or think about very large monorepos?
 *     - but this is perhaps okay as a first step
 *  - get blob data.
 *
 * actually, probably better to talk about different methods state actions will need
 *  - getDirectory: on seeing a CID for a commit object and a path for its associated file tree,
 *                  returns the children of the file tree node at the path (i.e. returns the
 *                  directory entries for the directory at the path)
 *  - getBlob: getDirectory but for navi
 */

function getDirStructure(cid) {
  // TODO: actually make requests to IPFS
  return {
    'package.json': null,
    '.babelrc': null,
    'webpack.config.js': null,
    'dist': { children: {
      'index.html': null,
      'styles.css': null,
    }},
    'src': { children: {
      'views': { children: {
        'index.js': null,
        'tree.js': null,
        'commit.js': null,
        'foo': { children: {
          'bar': { children: {} }
        }},
      }},
      'index.js': null,
    }},
  };
}

const cache = {
  cid: null,
  dirStructure: null
};

const navToSubtree = (tree, pathArray) => {
  let subTree = tree;
  for (const pathSeg of pathArray) {
    subTree = subTree[pathSeg].children;
  }
  return subTree;
};

function isObject(x) {
  return x === Object(x);
};

// `path` is an array of path segments
export const getDirectory = ({ cid, path }) => {
  /* For now only do tree views (blobs wont have clickable links):
   *
   * if `cid` is not the one currently stored
   *   get its entire "directory structure" (the file tree sans leaves)
   *
   * navigate to the appropriate subtree, return children of subtree root
   */
  if (cid !== cache.cid) {
    cache.dirStructure = getDirStructure(cid);
    cache.cid = cid;
  }
  const subtree = navToSubtree(cache.dirStructure, path);
  return Object.keys(subtree).map(name => ({ name: name,
                                             isDir: isObject(subtree[name]) }));
}
