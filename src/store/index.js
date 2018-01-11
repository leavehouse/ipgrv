import { getCommits as _getCommits } from "./commits"
import { getCommit as _getCommit } from "./commit"

export const getCommits = _getCommits;
export const getCommit = _getCommit;

const cache = {
  tree: {
    cid: null,
    dirStructure: null,
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
}

function dirStructureEntryIsBlob (entry) {
  return typeof entry === 'string';
}

// if e1 is a dir and e2 isnt, e1 before e2
// for e1, e2 of same type: compare alphabetically
function compareEntries(e1, e2) {
  if (e1.isDir !== e2.isDir) {
    return e1.isDir ? -1 : 1;
  } else {
    return e1.name <= e2.name ? -1 : 1;
  }
}

/*****/

async function getDirStructure(cid) {
  const treeCid = await getCommitTreeCid(cid)
  const dirStructure = await getGitTreeObject(treeCid);
  return dirStructure;
}


async function fetchCid(cid) {
  return (await fetch(`http://127.0.0.1:8080/api/v0/dag/get/${cid}`));
}

export async function fetchJsonCid(cid) {
  return (await fetchCid(cid).then(data => data.json()));
}

export async function getCommitTreeCid(cid) {
  const commit = await fetchJsonCid(cid);
  return commit.tree['/'];
}


// `node` is node of a IPLD representation of a git tree object
export function nodeIsTree(node) {
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
  for (i = 0; i < dirs.length; i++) {
    entries[dirs[i]] = { children: resolvedPromises[i] };
  }

  return entries;
}

export async function getGitBlobObject(cid) {
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
