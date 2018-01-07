import * as jsdiff from "diff"

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
  // TODO: handle commits with multiple parents
  commit: {
    cid: null,
    treeDiff: null,
  },
};

// TODO: this is kinda bad because we keep sorting over and over. should sort
// once, save it in the cache?
export async function getSortedDirectory({ cid, path }) {
  const dir = await getDirectory({ cid, path });
  dir.entries.sort(compareEntries);
  return dir;
}

// `path` is an array of path segments
export async function getBlob({ cid, path }) {
  if (cid !== cache.tree.cid) {
    cache.tree.dirStructure = await getDirStructure(cid);
    cache.tree.cid = cid;
  }
  const blobCid = navToSubtree(cache.tree.dirStructure, path);

  return getGitBlobObject(blobCid);
}

// `getCommit` takes `{ cid, page }` and returns the `page`-th page
// of a linear commit history of the IPLD git commit object at `cid`.
export async function getCommits({ cid, page, perPage }) {
  // we need to make a call to getGitCommitsList in the following two scenarios:
  //  - if `cid` is not the same as what's cached
  //  - if `page` is large enough to extend beyond the list that's stored and
  //    there are additional commits to fetch
  const neededForPage = page*perPage;
  if (cid !== cache.commits.cid) {
    const { newCommits, nextCids } = await getGitCommitsList({
      cids: [cid],
      number: neededForPage,
    });
    cache.commits.list = newCommits;
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

  // return the correct page, which is an array of length `perPage` of IPLD
  // git commit objects. page 1 should be list indexes `{0, ..., perPage - 1}`,
  // and in general page n is `{(n-1)*perPage, ..., n*perPage - 1}`
  return {
    commits: cache.commits.list.slice((page-1)*perPage, page*perPage),
    isAnotherPage: cache.commits.list.length >= page*perPage,
  }
}

export async function getCommitDiff({ cid }) {
  if (cid !== cache.commit.cid) {
    cache.commit.treeDiff = await getDiff(cid);
    cache.commit.cid = cid;
  }

  return flattenTreeDiff(cache.commit.treeDiff);
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
    newCommits.push({ cid: nextCid, commitObject: nextAncestor });
    if (nextAncestor.parents !== null) {
      toRequest = toRequest.concat(nextAncestor.parents.map(p => p['/']));
    }
  }

  return { newCommits, nextCids: toRequest }
}

function dirStructureEntryIsBlob (entry) {
  return typeof entry === 'string';
}

// `path` is an array of path segments
async function getDirectory({ cid, path }) {
  if (cid !== cache.tree.cid) {
    cache.tree.dirStructure = await getDirStructure(cid);
    cache.tree.cid = cid;
  }
  const subtree = navToSubtree(cache.tree.dirStructure, path);
  const readmeFileNames = Object.keys(subtree)
                          .filter(name =>
                            name.toUpperCase().startsWith("README") &&
                            dirStructureEntryIsBlob(subtree[name]));
  let readmeData = null;
  let readmeIsMarkdown = false;
  if (readmeFileNames.length > 0) {
    const readmeName = readmeFileNames[0];
    readmeData = await getGitBlobObject(subtree[readmeName]);
    // ALERT: this is duplicated w.r.t. the logic for doing syntax highlighting
    if (readmeName.endsWith('.md') || readmeName.endsWith('.markdown')) {
      readmeIsMarkdown = true;
    }
  }

  const entries = Object.keys(subtree)
                        .map(name => ({ name: name,
                                        isDir: isObject(subtree[name]) }));
  return {
    entries,
    readme: { data: readmeData, isMarkdown: readmeIsMarkdown },
  };
}

async function getCommitTreeCid(cid) {
  const commit = await fetchJsonCid(cid);
  return commit.tree['/'];
}

async function getDirStructure(cid) {
  const treeCid = await getCommitTreeCid(cid)
  const dirStructure = await getGitTreeObject(treeCid);
  return dirStructure;
}

// FIXME: for now only handles commits with at most one parent commit.
// Returns: an array of { <file path>, <jsdiff change object> } objects?
async function getDiff(cid) {
  const cidCommitObj = await fetchJsonCid(cid);
  const treeCidNew = cidCommitObj.tree['/'];
  if (cidCommitObj.parents && cidCommitObj.parents.length > 1) {
    throw new Error("Displaying commits with more than one parent is unimplemented");
  }
  let treeCidOld;
  if (!cidCommitObj.parents) {
    treeCidOld = null;
  } else if(cidCommitObj.parents.length === 1) {
    const parentCommitCid = cidCommitObj.parents[0]['/'];
    treeCidOld = await getCommitTreeCid(parentCommitCid);
  }
  return await getGitTreeDiff(treeCidNew, treeCidOld);
}

// `node` is node of a IPLD representation of a git tree object, which is
// of the form { name: <name>, mode: <mode>, cid: <cid> }
function nodeIsTree(node) {
  return node.mode === "40000";
}

// returns JS object representing a git tree object. the names of the tree's
// immediate children (which are either blobs or trees) are the keys of the
// object, while each key's value is either the cid of the IPLD object
// representing the blob object or a JS object representing the git tree object
// (obtained via recursive call to `getGitTreeObject`). It's structured this way
// because my current thinking is to read the entire filetree sans blob data
// into memory initially. This probably doesn't work for huge repos
async function getGitTreeObject(cid) {
  const tree = await fetchJsonCid(cid);
  let entries = {};
  const entryNames = Object.keys(tree);
  for (var i = 0; i < entryNames.length; i++) {
    const entry = entryNames[i];
    if (nodeIsTree(tree[entry])) {
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

async function getGitBlobObject(cid) {
  const blobB64 = await fetchCid(cid).then(function(response) {
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

const flattenTreeDiff = (treeDiff, prefix) => {
  prefix = prefix ? prefix+'/' : '';
  let diffArray = [];
  Object.keys(treeDiff).forEach(function (entry) {
    const entryPath = prefix+entry;
    // FIXME: This is a hack, should use a class and check for that?
    if (Array.isArray(treeDiff[entry])) {
      const diff = jsdiff.createPatch(entryPath, treeDiff[entry][0],
                                      treeDiff[entry][1]);
      diffArray.push( {path: entryPath, patch: diff })
    } else {
      diffArray = diffArray.concat(flattenTreeDiff(treeDiff[entry], entryPath));
    }
  });
  return diffArray;
};

// returns JS object representing the difference in going from the git tree object
// with cid `cidOld` to the git tree object with cid `cidNew`.
async function getGitTreeDiff(cidNew, cidOld) {
  const treeNew = cidNew ? await fetchJsonCid(cidNew) : {};
  const treeOld = cidOld ? await fetchJsonCid(cidOld) : {};
  const entriesNew = Object.keys(treeNew)
  const entriesOld = Object.keys(treeOld)

  // for each entry name in the old tree:
  //  - if it's not in the new tree, it was removed
  //  - if it's in the new tree:
  //     - if the cids are the same, ignore
  //     - if the cids are different:
  //        - if old is blob
  //           - if new is blob, just diff the blob data
  //           - if new is tree, remove old blob and add tree's blobs
  //        - if old is tree
  //           - if new is blob, remove tree's blobs, add new blob
  //           - if new are trees: recursive call getGitTreeDiff
  // for each entry name in the new tree not in the old tree:
  //  - if new is blob, blob was added
  //  - o.w. new is tree, all the blobs of the tree are added
  //
  // FIXME: for now we assume old and new entries are of the same type, can
  // handle other cases later (typically commits don't change a file into a
  // directory or vice versa)
  const diffEntries = {};
  for (var i = 0; i < entriesOld.length; i++) {
    const entryName = entriesOld[i];
    const entry = treeOld[entryName];
    if (!(entryName in treeNew)) {
      if (nodeIsTree(entry)) {
        diffEntries[entryName] = await getGitTreeDiff(null, entry.hash['/']);
      } else {
        const blobOld = await getGitBlobObject(entry.hash['/']);
        diffEntries[entryName] = [blobOld, '']
      }
    } else {
      const entryNew = treeNew[entryName];
      if (entry.hash['/'] !== entryNew.hash['/']) {
        if (nodeIsTree(entry)) {
          diffEntries[entryName] = await getGitTreeDiff(entryNew.hash['/'],
                                                        entry.hash['/']);
        } else {
          const blobOld = await getGitBlobObject(entry.hash['/']);
          const blobNew = await getGitBlobObject(entryNew.hash['/']);
          diffEntries[entryName] = [blobOld, blobNew]
        }
      }
    }
  }

  for (var i = 0; i < entriesNew.length; i++) {
    const entryName = entriesNew[i];
    const entry = treeNew[entryName];
    if (!(entryName in treeOld)) {
      if (nodeIsTree(entry)) {
        diffEntries[entryName] = await getGitTreeDiff(entry.hash['/'], null);
      } else {
        const blobNew = await getGitBlobObject(entry.hash['/']);
        diffEntries[entryName] = ['', blobNew]
      }
    }
  }
  return diffEntries;
}

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
