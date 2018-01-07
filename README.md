# ipgrv - interplanetary git repo view

ipgrv is web app that allows you to explore a git repository (for example, its file tree and history of commits). The UI is backed by ipfs, and you need to have a [go-ipfs](https://github.com/ipfs/go-ipfs/) daemon running locally to use ipgrv.

# Background

`go-ipfs` has a [git plugin](https://github.com/ipfs/go-ipfs/blob/ce22b83f24f72f18318c8649ff1bed3d3e96768e/docs/plugins.md#ipld) (built on [go-ipld-git](https://github.com/ipfs/go-ipld-git)) that can represent git commit, tree, tag and blob objects as IPLD objects. Furthermore, you can install [git-remote-ipld](https://github.com/magik6k/git-remote-ipld), which installs git hooks that allow you to do things like `git push ipld:: master` and `git clone ipld::<CID>` to push to and clone from IPFS.

Typical workflow:

 1. commit some changes to a branch of a git repo
 2. run `git push ipld:: HEAD`, which returns the CID of an IPLD object
    representing the commit
 3. Once you have the CID, you can visit `http://127.0.0.1:8080/ipfs/<ipgrv hash>/#!/tree/<CID>`

# Usage

NOTE: `npm run build` is currently broken, so the method below will not work. You'll have to launch the dev server.

To use it, make sure your ipfs daemon is started, and then visit

`http://127.0.0.1:8080/ipfs/<ipgrv hash>`

in your browser. Eventually there will be releases of this code, where we'll publish a fixed hash, so all you'll have to do is visit the URL with the appropriate hash inserted.

In the meantime, this project is under substantial development, so to get the hash you can:

 1. `git clone https://github.com/leavehouse/ipgrv`
 2. `cd ipgrv`
 3. `npm install`
 4. `npm run build`
 5. `ipfs add -r dist/`

This last command gives the hash.

# Development

`git clone` the repo, cd into the repo directory and do `npm install`. Then `npm start` starts the dev server.

Before you can use this, an ipfs daemon must be running. However, before that will work, you need to modify the config of the ipfs node to allow `localhost:<dev server port>` as an origin. Using the default port (8000), this can be done by executing:

```
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin "[\"localhost:8000\"]"
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials "[\"true\"]"
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods "[\"PUT\", \"POST\", \"GET\"]"
```

(If the ipfs daemon is already running, it needs to be restarted after the config change)

Provided that an ipfs daemon is running, you can now use the app by navigating to:

`http://127.0.0.1:8000`

`webpack-dev-server` will automatically reload the app in the browser when you make changes.

# Features

 - basic filetree and commit history views
 - for source files there is syntax highlighting for a handful of languages (html/css/js/typescript/markdown/json)
 - basic view of the diffs for an individual commit

# Missing features

 - render markdown blobs (have option to switch to viewing the raw text data)
 - syntax highlighting in diffs
 - do syntax highlighting for *all* the languages
 - Line numbers for text files in the blob view
 - searching the file tree and commit dag
 - to properly duplicate github features, we want to browse an entire repo, not
   just a commit object. this additionally includes the set of branches (and
   tags?)
