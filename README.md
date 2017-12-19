# ipgrv - interplanetary git repo view

ipgrv is web app that allows you to explore a git repository (for example, its file tree and history of commits). The UI is backed by ipfs, and you need to have a [go-ipfs](https://github.com/ipfs/go-ipfs/) daemon running locally to use ipgrv.

# Background

`go-ipfs` has a [git plugin](https://github.com/ipfs/go-ipfs/blob/ce22b83f24f72f18318c8649ff1bed3d3e96768e/docs/plugins.md#ipld) (built on [go-ipld-git](https://github.com/ipfs/go-ipld-git)) that can represent git commit, tree, tag and blob objects as IPLD objects. Furthermore, you can install [git-remote-ipld](https://github.com/magik6k/git-remote-ipld), which installs git hooks that allow you to do things like `git push ipld:: master` and `git clone ipld::<CID>` to push to and clone from IPFS.

Typical workflow:

 1. commit some changes to a branch of a git repo
 2. run `git push ipld:: HEAD`, which returns the CID of an IPLD object
    representing the commit
 3. Once you have the CID, you can visit `http://127.0.0.1:8080/ipfs/<ipgrv hash>/tree/<CID>`

# Usage

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

# Features

Basic filetree and commit history views. The blob view currently doesn't handle binary files appropriately, but for source files there is syntax highlighting for a handful of languages (html/css/js/typescript/markdown/json).

# Missing features

 - Viewing the diff of an individual commit.
 - render markdown files automatically. Also render any READMEs underneath the
   file tree view
 - Line numbers for text files in the blob view
 - search the tree and commit history associated with a git commit object
