import * as jsdiff from "diff"
import { h } from "hyperapp"
import { Route, Link } from "hyperapp-hash-router"
import "font-awesome/css/font-awesome.css"

import { Filetree, Blob } from "./filetree"
import { CommitHistory } from "./commit-history"

const commitCids = {
  goIpfs: "z8mWaGp848SHMkg6nQJLWMUMcJ7pdjppt",
  hyperapp: "z8mWaGRCe67AnSJ3izSecirBAHHtG6MAv",
  ipgrv: "z8mWaJYTRDURhSbJte3ziL2urY1CQeXBs",
  remoteGitIpld: "z8mWaGrXpUa7NqpbJtD66XcosShzfPwNg",
};

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
    Route({
      path: '/commit/:cid',
      render: Commit({ getCommitDiff: actions.commit.get,
                       commitState: state.commit }),
    }),
  ]);

const Home = () =>
  h('div', {}, [
    'Demo repos: ',
    h('ul', {}, [
      h('li', {}, Link({ to: `/tree/${commitCids.goIpfs}` }, 'go-ipfs')),
      h('li', {}, Link({ to: `/tree/${commitCids.remoteGitIpld}` },
                       'remote-git-ipld')),
      h('li', {}, Link({ to: `/tree/${commitCids.ipgrv}` }, 'ipgrv')),
      h('li', {}, Link({ to: `/tree/${commitCids.hyperapp}` }, 'hyperapp')),
    ]),
  ]);


const Commit = ({ getCommitDiff, commitState }) => ({ location, match }) => {
  function getCurrentCommitDiff() {
    getCommitDiff({ cid: match.params.cid });
  }

  let diffItems;
  if (commitState.isLoaded) {
    diffItems = commitState.treeDiff.map(({ patch }) => {
      return (
        h('div', {}, [
          h('pre', {}, patch),
        ])
      );
    });
  };

  return (
    h('div', {oncreate() { getCurrentCommitDiff() },
              onupdate() { getCurrentCommitDiff() }}, [
      h('h1', {class: 'f2'}, 'Commit'),
      h('h2', {class: 'f4'}, 'commit object CID: '+match.params.cid),
      diffItems,
    ])
  );
};
