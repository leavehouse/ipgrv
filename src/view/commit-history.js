import { h } from "hyperapp"
import { Link } from "hyperapp-hash-router"

export const CommitHistory = ({getCommitsPage, commitsState}) => ({ location, match }) => {
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
    getCommitsPage({ cid: match.params.cid, page: parsedCommitPage });
  }

  const commitListItems = commitsState.list.map(CommitHistoryItem);

  // oncreate and onupdate we need request commit history from the store
  // and update state.commits.list and state.commits.pageNumber

  return (
    h('div', {oncreate() { getCurrentCommitPage() },
              onupdate() { getCurrentCommitPage() }}, [
      h('h1', {class: 'f2'}, 'Commits'),
      h('h2', {class: 'f4'}, 'commit object CID: '+match.params.cid),
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

const CommitHistoryItem = (commitInfo) => {
  const commit = commitInfo.commitObject;
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

  const authorCommitter =
    commit.author.email === commit.committer.email
      ? `by ${commit.author.name} <${commit.author.email}>`
      : `by ${commit.author.name} <${commit.author.email}> with ${commit.committer.name} <${commit.committer.email}>`;

  const commitTimestamp = parseCommitDateString(commit.committer.date);
  const commitDate = new Date(commitTimestamp*1000);

  return (
    h('li', {class: 'commit-history-item'}, [
      h('pre', {}, commit.message),
      h('p', {}, `${authorCommitter} on ${commitDate.toLocaleString()}`),
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
