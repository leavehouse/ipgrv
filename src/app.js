import { app } from "hyperapp"
import { location } from "@hyperapp/router"
import { mainView } from "./view"

const topics = {
  state: {
    location: location.state,
  },
  actions: {
    location: location.actions,
  },
  view: mainView,
};

const actions = app(topics);
const unsubscribe = location.subscribe(actions.location);
