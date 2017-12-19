const PER_PAGE = 20;

const cache = {
  tree: {
    cid: null,
    dirStructure: null,
  },
  commits: {
    cid: null,
    // unlike tree.dirStructure, this list may not be complete (there may be
    // tens of thousands of commits), so we have to store the cids of next
    // ancestor commits to gather history from
    list: [],
    nextAncestorCids: null,
  },
};

// TODO: this is kinda bad because we keep sorting over and over. should sort
// once, save it in the cache?
export async function getSortedDirectory({ cid, path }) {
  return (await getDirectory({ cid, path })).sort(compareEntries);
}

// `getCommit` takes `{ cid, page }` and returns the `page`-th page
// of a linear commit history of the IPLD git commit object at `cid`.
export async function getCommits({ cid, page }) {
  // PER_PAGE =? 20

  // we need to make a call to getGitCommitsList in the following two scenarios:
  //  - if `cid` is not the same as what's cached
  //  - if `page` is large enough to extend beyond the list that's stored and
  //    there are additional commits to fetch
  const neededForPage = page*PER_PAGE;
  if (cid !== cache.commits.cid) {
    const { newCommits, nextCids } = await getGitCommitsList({
      cids: [cid],
      number: neededForPage,
    });
    cache.commits.list = cache.commits.list.concat(newCommits);
    cache.commits.nextAncestorCids = nextCids;
    cache.commits.cid = cid;
  } else if (neededForPage > cache.commits.list.length
             && cache.commits.nextAncestorCids) {
    const { newCommits, nextCids } = await getGitCommitsList({
      cids: cache.commits.nextAncestorCids,
      number: neededForPage - cache.commits.list.length,
    });
    cache.commits.list = cache.commits.list.concat(newCommits);
    cache.commits.nextAncestorCids = nextCids;
  }

  // return the correct page, which is an array of length `PER_PAGE` of IPLD
  // git commit objects. page 1 should be list indexes `{0, ..., PER_PAGE - 1}`,
  // and in general page n is `{(n-1)*PER_PAGE, ..., n*PER_PAGE - 1}`
  return {
    commitPage: cache.commits.list.slice((page-1)*PER_PAGE, page*PER_PAGE),
    isAnotherPage: cache.commits.nextAncestorCids.length > 0,
  }
}

// `path` is an array of path segments
export async function getBlob({ cid, path }) {
  if (cid !== cache.tree.cid) {
    cache.tree.dirStructure = await getDirStructure(cid);
    cache.tree.cid = cid;
  }
  const blobCid = navToSubtree(cache.tree.dirStructure, path);

  const blobB64 = await fetchCid(blobCid).then(function(response) {
    return response.text();
  }).then(function(blobResponseText) {
    return blobResponseText.trim().replace(/^"/, '').replace(/"$/, '');
  });

  // TODO: use a library to convert to an array of bytes, only convert to
  // string if its a text file?
  let decodedBlobString = window.atob(blobB64);
  const nulIndex = decodedBlobString.indexOf('\u0000');
  return decodedBlobString.substring(nulIndex + 1)
}

async function fetchCid(cid) {
  return (await fetch(`http://127.0.0.1:8080/api/v0/dag/get/${cid}`));
}

async function fetchJsonCid(cid) {
  return (await fetchCid(cid).then(data => data.json()));
}


// Arguments:
//   `cids` - an array of cids of git commit objects.
//   `number` - the number of cids to return at minimum. (may return more?)
// Returns:
//   `newCommits` - list of at least `number` IPLD git commit objects
//   `nextCids` - queue of cids to use next
async function getGitCommitsList({ cids, number }) {
  console.log(`getGitCommitsList: cids = ${cids}, number = ${number}`);
  let newCommits = [];
  let toRequest = cids

  // TODO: toRequest should be a priority queue of commit objects, where most
  // recent is first?
  //
  // while toRequest not empty and newCommits.length < number:
  //   const nextCid = remove the cid of the oldest commit from toRequest
  //   const nextAncestor = await fetchJsonCid(nextCid)
  //   newCommits.push(nextAncestor);
  //   toRequest = toRequest.concat(nextAncestor.parents);
  while (toRequest.length > 0 && newCommits.length < number) {
    const nextCid = toRequest.shift();
    const nextAncestor = await fetchJsonCid(nextCid);
    newCommits.push(nextAncestor);
    if (nextAncestor.parents !== null) {
      toRequest = toRequest.concat(nextAncestor.parents.map(p => p['/']));
    }
  }

  return { newCommits, nextCids: toRequest }
}

// `path` is an array of path segments
async function getDirectory({ cid, path }) {
  if (cid !== cache.tree.cid) {
    cache.tree.dirStructure = await getDirStructure(cid);
    cache.tree.cid = cid;
  }
  const subtree = navToSubtree(cache.tree.dirStructure, path);
  return Object.keys(subtree).map(name => ({ name: name,
                                             isDir: isObject(subtree[name]) }));
}

async function getDirStructure(cid) {
  const commit = await fetchJsonCid(cid);
  const treeCid = commit.tree['/'];
  const dirStructure = await getGitTreeObject(treeCid);
  return dirStructure;
}

async function getGitTreeObject(cid) {
  const tree = await fetchJsonCid(cid);
  let entries = {};
  // TODO: use Promise.all to do each directory in parallel!
  const entryNames = Object.keys(tree);
  for (var i = 0; i < entryNames.length; i++) {
    const entry = entryNames[i];
    if (tree[entry].mode === '40000') {
      // is a directory
      let entryTreeCid = tree[entry].hash['/'];
      entries[entry] = await getGitTreeObject(entryTreeCid);
    } else {
      // is a blob, so store the blob cid instead
      entries[entry] = await tree[entry].hash['/'];
    }
  }
  // array of entries in current directory that are themselves directories
  const dirs = Object.keys(entries)
                     .sort()
                     .filter(entry => typeof entries[entry] !== 'string');

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
    subTree = subTree[pathSeg];
    if (typeof subTree !== 'string') {
      // if its not a blob, it's a tree, says me! (TODO: make sure this works with
      // symlinks and submodules and whatever)
      subTree = subTree.children
    }
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
