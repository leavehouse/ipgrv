import { fetchJsonCid } from "./index"
import { pushArray } from "../utils"

// incrementally explores more of the git commit DAG, resulting in a linear
// history of commits (which is saved in cache.list)
// We only ever request enough entries to fill up to the requested page number,
// but no more (e.g. if we request page 5 with 20 per page, it will crawl the
// DAG 5*20 = 100 commits)
const cache = {
  cid: null,
  list: [],
  nextAncestorCids: null,
};

// `getCommit` takes `{ cid, page }` and returns the `page`-th page
// of a linear commit history of the IPLD git commit object at `cid`.
export async function getCommits({ cid, page, perPage }) {
  // we need to make a call to getGitCommitsList in the following two scenarios:
  //  - if `cid` is not the same as what's cached
  //  - if `page` is large enough to extend beyond the list that's stored and
  //    there are additional commits to fetch
  const neededForPage = page*perPage;
  if (cid !== cache.cid) {
    const { newCommits, nextCids } = await getGitCommitsList({
      cids: [cid],
      number: neededForPage,
    });
    cache.list = newCommits;
    cache.nextAncestorCids = nextCids;
    cache.cid = cid;
  } else if (neededForPage > cache.list.length
             && cache.nextAncestorCids) {
    const { newCommits, nextCids } = await getGitCommitsList({
      cids: cache.nextAncestorCids,
      number: neededForPage - cache.list.length,
    });
    pushArray(cache.list, newCommits);
    cache.nextAncestorCids = nextCids;
  }

  const isAnotherPage = cache.list.length > page*perPage ||
    (cache.list.length === page*perPage
     && cache.nextAncestorCids.length > 0);

  // return the correct page, which is an array of length `perPage` of IPLD
  // git commit objects. page 1 should be list indexes `{0, ..., perPage - 1}`,
  // and in general page n is `{(n-1)*perPage, ..., n*perPage - 1}`
  return {
    commits: cache.list.slice((page-1)*perPage, page*perPage),
    isAnotherPage: isAnotherPage,
  }
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
