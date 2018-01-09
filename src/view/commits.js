import { h } from "hyperapp"
import { Link } from "hyperapp-hash-router"

export const commitsPerPage = 20;

export const CommitHistory = ({getPage, commitsState}) => ({ location, match }) => {
  const hashPath = location.hash.substring(2);
  // get the page number from the url. This will become the new state
  const commitPagePath = (hashPath.length === match.url.length
                          ? '/1'
                          : hashPath.substring(match.url.length));
  const parsedCommitPage = parseInt(commitPagePath.substring(1));
  if (isNaN(parsedCommitPage)) {
    throw new Error("Invalid route, fix this later");
  }

  function getCurrentCommitPage() {
    getPage({ cid: match.params.cid, page: parsedCommitPage });
  }

  const commitListItems = commitsState.list.map(CommitHistoryItem);

  // oncreate and onupdate we need request commit history from the store
  // and update state.commits.list and state.commits.pageNumber

  return (
    h('div', {oncreate() { getCurrentCommitPage() },
              onupdate() { getCurrentCommitPage() }}, [
      h('h1', {class: 'f4'}, 'commit object CID: '+match.params.cid),
      h('p', {}, Link({ to: `/tree/${match.params.cid}` }, 'File tree')),
      !commitsState.isLoading && [
        h('ol', {class: 'commit-history'}, commitListItems),
        CommitHistoryNavBar({
          pageNumber: parsedCommitPage,
          isAnotherPage: commitsState.isAnotherPage,
          matchUrl: match.url
        }),
      ],
    ])
  );

};

export const Commit = ({ getCommitDiff, commitState }) => ({ location, match }) => {
  function getCurrentCommitDiff() {
    getCommitDiff({ cid: match.params.cid });
  }

  let diffItems;
  let commitAuthorAndDate;
  if (commitState.isLoaded) {
    diffItems = commitState.treeDiff.map(({ patch }) => {
      return (
        h('div', {}, [
          h('pre', {}, patch),
        ])
      );
    });
    commitAuthorAndDate = makeCommitAuthorAndDate(commitState.commit);
  };


  return (
    h('div', {oncreate() { getCurrentCommitDiff() },
              onupdate() { getCurrentCommitDiff() }}, [
      h('h1', {class: 'f4'}, 'commit object CID: '+match.params.cid),
      commitAuthorAndDate && h('p', {}, `committed ${commitAuthorAndDate}`),
      diffItems,
    ])
  );
};

// git commit date strings seem to be formatted like
// '<unix timestamp> <timezone offset>', so this function is for ignoring
// the timezone
function parseCommitDateString (dateStr) {
  const unixTimestampStr =
    dateStr.indexOf(' ') !== -1
      ? dateStr.split(' ')[0]
      : /* not sure if this is even possible */ dateStr;

  // TODO: handle parse failure?
  return parseInt(unixTimestampStr);
}

function makeCommitAuthorString(commit) {
  return (
    `by ${commit.author.name} <${commit.author.email}>` +
    (commit.author.email === commit.committer.email
      ? ''
      : ` with ${commit.committer.name} <${commit.committer.email}>`)
  );
}
function makeCommitAuthorAndDate(commit) {
  const commitAuthor = makeCommitAuthorString(commit);
  const commitTimestamp = parseCommitDateString(commit.committer.date);
  const commitDate = new Date(commitTimestamp*1000);
  return `${commitAuthor} on ${commitDate.toLocaleString()}`;
}

const CommitHistoryItem = (commitInfo) => {
  const commit = commitInfo.commitObject;
  const commitAuthorAndDate = makeCommitAuthorAndDate(commit);

  return (
    h('li', {class: 'commit-history-item'}, [
      h('pre', {}, commit.message),
      h('p', {}, commitAuthorAndDate),
      h('ul', {}, [
        h('li', {}, Link({ to: `/commit/${commitInfo.cid}` }, 'View commit')),
        h('li', {}, Link({ to: `/tree/${commitInfo.cid}` },
                         'Browse tree at this commit')),
      ]),
    ])
  );
};

const CommitHistoryNavBar = ({ matchUrl, pageNumber, isAnotherPage }) =>
  h('nav', {class: 'commit-history-nav'},
    h('ul', {}, [
      pageNumber === 1
        ? null
        : h('li', {},
            Link({to: `${matchUrl}/${pageNumber - 1}` }, 'Newer')),
      isAnotherPage
        ? h('li', {},
            Link({to: `${matchUrl}/${pageNumber + 1}` }, 'Older'))
        : null,
    ]));
