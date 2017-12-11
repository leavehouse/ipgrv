import { app } from "hyperapp"
import { location } from "@hyperapp/router"
import { mainView } from "./view"
import { getSortedDirectory } from "./store"
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
        console.log("getPath, entries = ", entries);
        actions.setState({
          isLoading: false,
          entries: entries,
        });
      },
    },
  },
  view: mainView,
};

const actions = app(topics);
const unsubscribe = location.subscribe(actions.location);
