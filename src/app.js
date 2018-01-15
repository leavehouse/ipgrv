import { app } from "hyperapp"
import { location } from "hyperapp-hash-router"
import "tachyons/css/tachyons.css"
import { model } from "./model"
import "./styles.css"
import { mainView } from "./view"

const {state, actions} = model;
const appActions = app(state, actions, mainView, document.body);
location.subscribe(appActions.location);
