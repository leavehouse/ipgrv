import * as jsdiff from "diff"

import { fetchJsonCid, getCommitTreeCid, nodeIsTree } from "./index"
import { getGitBlobObject } from "./filetree"

// TODO: handle commits with multiple parents
var cache = {
  cid: null,
  commit: null,
  treeDiff: null,
};

export async function getCommit({ cid }) {
  if (cid !== cache.cid) {
    const { commit, treeDiff } = await getCommitAndDiff(cid);
    cache.commit = commit;
    cache.treeDiff = treeDiff;
    cache.cid = cid;
  }

  return {
    commit: cache.commit,
    treeDiff: flattenTreeDiff(cache.treeDiff)
  };
}

// FIXME: for now only handles commits with at most one parent commit.
// Returns: an array of { <file path>, <jsdiff change object> } objects?
async function getCommitAndDiff(cid) {
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
  return {
    commit: cidCommitObj,
    treeDiff: await getGitTreeDiff(treeCidNew, treeCidOld)
  };
}

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

  for (i = 0; i < entriesNew.length; i++) {
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
