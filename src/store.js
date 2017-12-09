async function getDirStructure(cid) {
  // TODO: actually make requests to IPFS
  // `dag get` the cid to get IPLD-representation of the commit object
  // for now we only handle the tree, so `dag get` the tree object
  // then recursively parse the entire hierarchy of tree objects
  const commit = (await fetch(`http://127.0.0.1:5001/api/v0/dag/get/${cid}`)
                    .then(data => data.json()));
  console.log("commit = ", commit);
  const treeCid = commit.tree['/'];
  const commitTree = (await fetch(`http://127.0.0.1:5001/api/v0/dag/get/${treeCid}`)
                    .then(data => data.json()));
  console.log("commit tree = ", commitTree);
  let ds = {};
  Object.keys(commitTree).forEach(entry => {
    // TODO: handle symlinks? what other kinds of files can
    // appear in a tree object? should probably switch on commitTree[entry].mode ?
    if (commitTree[entry].mode === '40000') {
      // is a directory
      let entryTreeCid = commitTree[entry].hash['/'];
    } else {
      // is a blob?
      ds[entry] = null;
    }
  });
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
