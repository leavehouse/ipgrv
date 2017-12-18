import { location } from "hyperapp-hash-router"
import { getSortedDirectory, getCommits, getBlob } from "./store"
import { treePathEquals } from "./utils"

const state = {
  location: location.state,
  tree: {
    // commitCid and path are only for determining whether `entries` is correct
    // they are not used in rendering
    commitCid: null,
    path: null,
    isLoading: false,
    entries: [],
  },
  blob: {
    commitCid: null,
    path: null,
    isLoading: false,
    data: null,
  },
  commits: {
    commitCid: null,
    pageNumber: null,
    isAnotherPage: null,
    isLoading: false,
    list: [],
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
        entries: [],
      });
      const entries = await getSortedDirectory({ cid, path });
      actions.setState({
        isLoading: false,
        entries: entries,
      });
    },
  },
  // TODO
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
        data: null,
      });
      const data = await getBlob({ cid, path });
      // TODO: distinguish between binary data and text (i.e. unicode?) data
      actions.setState({
        isLoading: false,
        data: data,
      });
    },
  },
  // oncreate and onupdate we need request commit history from the store
  // and update state.commits.list and state.commits.pageNumber
  commits: {
    setState: newState => newState,
    getPage: ({cid, page}) => async (state, actions) => {
      if (state.commitCid === cid && state.pageNumber === page) {
        console.log("terminating early because cid and page are the same!");
        return;
      }

      actions.setState({
        commitCid: cid,
        pageNumber: page,
        isLoading: true,
        isAnotherPage: null,
        list: [],
      });
      const { commitPage, isAnotherPage } = await getCommits({ cid, page });
      console.log("getPage, list = ", commitPage);
      actions.setState({
        isLoading: false,
        isAnotherPage: isAnotherPage,
        list: commitPage,
      });
    },
  },
};

export const model = { state, actions };
