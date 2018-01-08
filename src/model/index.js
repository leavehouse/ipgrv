import { location } from "hyperapp-hash-router"
import { getSortedDirectory, getBlob, getCommitDiff } from "../store"
import { treePathEquals } from "../utils"

import { CommitHistory } from "./commits"

const state = {
  location: location.state,
  tree: {
    // commitCid and path are only for determining whether `entries` is correct
    // they are not used in rendering
    commitCid: null,
    path: null,
    isLoading: true,
    entries: [],
    readme: {
      data: null,
      isMarkdown: false,
    },
  },
  blob: {
    commitCid: null,
    path: null,
    isLoading: true,
    data: null,
  },
  commits: CommitHistory.state,
  commit: {
    commitCid: null,
    isLoaded: null,
    treeDiff: null,
  }
};

const actions = {
  location: location.actions,
  tree: {
    setState: newState => newState,
    // path is an array of path segments
    getPath: ({cid, path}) => async (state, actions) => {
      if (state.commitCid === cid && treePathEquals(state.path, path)) {
        return;
      }
      actions.setState({
        commitCid: cid,
        path: path,
        isLoading: true,
      });
      const { entries, readme } = await getSortedDirectory({ cid, path });
      actions.setState({
        isLoading: false,
        entries: entries,
        readme: readme,
      });
    },
  },
  blob: {
    setState: newState => newState,
    get: ({cid, path}) => async (state, actions) => {
      if (state.commitCid === cid && treePathEquals(state.path, path)) {
        return;
      }
      actions.setState({
        commitCid: cid,
        path: path,
        isLoading: true,
      });
      const data = await getBlob({ cid, path });
      // TODO: distinguish between binary data and text (i.e. unicode?) data
      actions.setState({
        isLoading: false,
        data: data,
      });
    },
  },
  commits: CommitHistory.actions,
  commit: {
    setState: newState => newState,
    get: ({cid}) => async (state, actions) => {
      if (state.commitCid === cid) {
        return;
      }

      actions.setState({
        commitCid: cid,
        isLoaded: false,
        treeDiff: null,
      });
      const commitDiff = await getCommitDiff({ cid });
      actions.setState({
        isLoaded: true,
        treeDiff: commitDiff,
      });
    },
  },
};

export const model = { state, actions };
