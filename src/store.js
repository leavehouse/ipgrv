const cache = {
  cid: null,
  dirStructure: null
};

// TODO: this is wrong because we keep sorting over and over. should sort
// once, save it in the cache?
export async function getSortedDirectory({ cid, path }) {
  return (await getDirectory({ cid, path })).sort(compareEntries);
}

// `path` is an array of path segments
async function getDirectory({ cid, path }) {
  if (cid !== cache.cid) {
    cache.dirStructure = await getDirStructure(cid);
    cache.cid = cid;
  }
  const subtree = navToSubtree(cache.dirStructure, path);
  return Object.keys(subtree).map(name => ({ name: name,
                                             isDir: isObject(subtree[name]) }));
}

async function getDirStructure(cid) {
  const commit = (await fetch(`http://127.0.0.1:5001/api/v0/dag/get/${cid}`)
                    .then(data => data.json()));
  const treeCid = commit.tree['/'];
  const dirStructure = await getGitTreeObject(treeCid);
  return dirStructure;
}

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
  // array of entries in current directory that are themselves directories
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

// if e1 is a dir and e2 isnt, e1 before e2
// (if e2 is a dir and e1 isnt, e2 before e1)
// for e1, e2 of same type: compare alphabetically
function compareEntries(e1, e2) {
  if (e1.isDir !== e2.isDir) {
    return e1.isDir ? -1 : 1;
  } else {
    return e1.name <= e2.name ? -1 : 1;
  }
}

/*
export function syncGetDirectory({ path }) {
  let ds = {
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
  const subtree = navToSubtree(ds, path);
  return Object.keys(subtree).map(name => ({ name: name,
                                             isDir: isObject(subtree[name]) }));
}
*/
