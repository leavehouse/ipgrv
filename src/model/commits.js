import { getCommits } from "../store"
import { commitsPerPage } from "../view/commits"

const state = {
  commitCid: null,
  pageNumber: null,
  isAnotherPage: null,
  isLoading: true,
  list: [],
};

const actions = {
  setState: newState => newState,
  getPage: ({cid, page}) => async (state, actions) => {
    if (state.commitCid === cid && state.pageNumber === page) {
      return;
    }

    actions.setState({
      commitCid: cid,
      pageNumber: page,
      isLoading: true,
      isAnotherPage: null,
      list: [],
    });
    const { commits, isAnotherPage } = await getCommits({
      cid,
      page,
      perPage: commitsPerPage
    });
    actions.setState({
      isLoading: false,
      isAnotherPage: isAnotherPage,
      list: commits,
    });
  },
};

export const CommitHistory = { state, actions };
