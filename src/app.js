import { app } from "hyperapp"
import { location } from "@hyperapp/router"
import { model } from "./model"
import { mainView } from "./view"
import "tachyons/css/tachyons.css"

const {state, actions} = model;
const appActions = app(state, actions, mainView, document.body);
const unsubscribe = location.subscribe(appActions.location);
