import { h } from "hyperapp"
import { Route, Link } from "hyperapp-hash-router"
import "font-awesome/css/font-awesome.css"

import { Filetree, Blob } from "./filetree"

const ipgrvCommitHash = "z8mWaHQgBqf1t5mJUYLBtEFVTgeU73PGk";
const hyperappCommitHash = "z8mWaG3NDBUKsiiV88mMcWHHwqFiUC3DQ";

export const mainView = (state, actions) =>
  h('main', {}, [
    Route({ path: '/', render: Home }),
    Route({
      path: '/tree/:cid',
      render: Filetree({ getTreePath: actions.tree.getPath,
                         treeState: state.tree }),
      parent: true,
    }),
    Route({
      path: '/blob/:cid',
      render: Blob({ getBlob: actions.blob.get, blobState: state.blob }),
      parent: true,
    }),
    Route({
      path: '/commits/:cid',
      render: CommitHistory({ getCommitsPage: actions.commits.getPage,
                              commitsState: state.commits }),
      parent: true,
    }),
  ]);

const Home = () =>
  h('ul', {}, [
    h('li', {}, Link({ to: `/tree/${ipgrvCommitHash}` }, 'ipgrv repo')),
    h('li', {}, Link({ to: `/tree/${hyperappCommitHash}` }, 'hyperapp repo')),
  ]);

const CommitHistory = ({getCommitsPage, commitsState}) => ({ location, match }) => {
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

  const commitListItems = commitsState.list.map(commitInfo => {
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
        Link({ to: `/tree/${commitInfo.cid}` }, 'Browse tree at this commit'),
      ])
    );
  });

  let pageIsLoading = commitsState.isLoading;
  if (match.params.cid !== commitsState.commitCid
      || commitsState.pageNumber !== parsedCommitPage) {
    pageIsLoading = true;
  }

  // oncreate and onupdate we need request commit history from the store
  // and update state.commits.list and state.commits.pageNumber

  return (
    h('div', {oncreate() { getCurrentCommitPage() },
              onupdate() { getCurrentCommitPage() }}, [
      h('h1', {class: 'f2'}, 'Commits'),
      h('h2', {class: 'f4'}, 'commit object CID: '+match.params.cid),
      !pageIsLoading && h('ol', {class: 'commit-history'}, commitListItems),
      !pageIsLoading && CommitHistoryNavBar({
        pageNumber: parsedCommitPage,
        isAnotherPage: commitsState.isAnotherPage,
        matchUrl: match.url
      }),
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
    ]))
