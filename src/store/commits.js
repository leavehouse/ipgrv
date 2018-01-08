import { fetchJsonCid } from "./index"
import { pushArray } from "../utils"

// the git commit Dag is incrementally explored in `getCommits`, which results in a
// linear history of commits (which is saved in cache.list)
// We only ever request enough entries to fill up to the requested page number,
// but no more (e.g. if we request page 5 with 20 per page, it will crawl the
// DAG 5*20 = 100 commits)
const cache = {
  cid: null,
  list: [],
  prev: {},
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
    cache.prev = {};
    const { newCommits, nextCids } = await getGitCommitsList({
      cids: [cid],
      number: neededForPage,
      prev: cache.prev
    });
    cache.list = newCommits;
    cache.nextAncestorCids = nextCids;
    cache.cid = cid;
  } else if (neededForPage > cache.list.length
             && cache.nextAncestorCids) {
    const { newCommits, nextCids } = await getGitCommitsList({
      cids: cache.nextAncestorCids,
      number: neededForPage - cache.list.length,
      prev: cache.prev,
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
//   `number` - the number of cids to return at minimum (may return more)
//   `prev` - the cids previously added to the list (object of `{<cid>: true}`
//            key-value pairs)
// Returns:
//   `newCommits` - list of at least `number` (cid, IPLD git commit object)
//                  pairs, none of which are duplicates of cids in `prev`
//   `nextCids` - queue of cids of ancestor commit objects to add next
// NOTE: items in `newCommits` are added to `prev`
async function getGitCommitsList({ cids, number, prev }) {
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
    if (!prev[nextCid]) {
      const nextAncestor = await fetchJsonCid(nextCid);
      newCommits.push({ cid: nextCid, commitObject: nextAncestor });
      if (nextAncestor.parents !== null) {
        pushArray(toRequest, nextAncestor.parents.map(p => p['/']));
      }
      prev[nextCid] = true;
    }
  }

  return { newCommits, nextCids: toRequest }
}
