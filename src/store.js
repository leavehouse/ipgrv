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
  if (cid !== cache.cid) {
    cache.dirStructure = getDirStructure(cid);
    cache.cid = cid;
  }
  const subtree = navToSubtree(cache.dirStructure, path);
  return Object.keys(subtree).map(name => ({ name: name,
                                             isDir: isObject(subtree[name]) }));
}
