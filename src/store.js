async function getGitTreeObject(cid) {
  const tree = (await fetch(`http://127.0.0.1:5001/api/v0/dag/get/${cid}`)
                    .then(data => data.json()));
  let entries = {};
  Object.keys(tree).forEach(function(entry) {
    if (tree[entry].mode === '40000') {
      // is a directory
      let entryTreeCid = tree[entry].hash['/'];
      entries[entry] = getGitTreeObject(entryTreeCid);
    } else {
      // is a blob?
      entries[entry] = null;
    }
  });
  // array of files in current directory that are themselves directories
  const dirs = Object.keys(entries)
                     .sort()
                     .filter(entry => entries[entry] !== null);

  const promises = dirs.map(entry => entries[entry]);
  const resolvedPromises = await Promise.all(promises);
  // iterate through (dir, promise) pairs
  for (var i = 0; i < dirs.length; i++) {
    entries[dirs[i]] = { children: resolvedPromises[i] };
  }

  return entries;
}

async function getDirStructure(cid) {
  // TODO: actually make requests to IPFS
  // `dag get` the cid to get IPLD-representation of the commit object
  // for now we only handle the tree, so `dag get` the tree object
  // then recursively parse the entire hierarchy of tree objects

  const commit = (await fetch(`http://127.0.0.1:5001/api/v0/dag/get/${cid}`)
                    .then(data => data.json()));
  const treeCid = commit.tree['/'];
  const dirStructure = await getGitTreeObject(treeCid);
  return dirStructure;
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
export async function getDirectory({ cid, path }) {
  if (cid !== cache.cid) {
    cache.dirStructure = await getDirStructure(cid);
    cache.cid = cid;
  }
  const subtree = navToSubtree(cache.dirStructure, path);
  return Object.keys(subtree).map(name => ({ name: name,
                                             isDir: isObject(subtree[name]) }));
}

