import { getCommits as _getCommits } from "./commits"
import { getCommit as _getCommit } from "./commit"
import {
  getSortedDirectory as _getSortedDirectory,
  getBlob as _getBlob
} from "./filetree"

export const getCommits = _getCommits;
export const getCommit = _getCommit;
export const getSortedDirectory = _getSortedDirectory;
export const getBlob = _getBlob;

export async function fetchCid(cid) {
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
