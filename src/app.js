import { app } from "hyperapp"
import { location } from "@hyperapp/router"
import { mainView } from "./view"
import { getSortedDirectory, getCommits, getBlob } from "./store"
import { treePathEquals } from "./utils"

const topics = {
  state: {
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
  },
  actions: {
    location: location.actions,
    tree: {
      setState: newState => newState,
      // path is an array of path segments
      getPath: ({cid, path}) => state => async actions => {
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
      get: ({cid, path}) => state => async actions => {
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
      getPage: ({cid, page}) => state => async actions => {
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
  },
  view: mainView,
};

const actions = app(topics);
const unsubscribe = location.subscribe(actions.location);
