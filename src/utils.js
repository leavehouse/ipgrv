import baseX from "base-x";

export function treePathEquals (path1, path2) {
  if (path1.length != path2.length) {
    return false;
  }
  for (var i = 0; i < path1.length; i++) {
    if (path1[i] !== path2[i]) {
      return false;
    }
  }
  return true;
}

// Don't mind me, just copying and pasting code from Stack Overflow
// (https://stackoverflow.com/questions/1787322/htmlspecialchars-equivalent-in-javascript/4835406#4835406):
export function escapeHtml (text) {
    var map = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };

    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

export function pushArray(arr, xs) {
  for (var i = 0; i < xs.length; i++) {
    arr.push(xs[i]);
  }
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const bs58 = baseX(BASE58);

// adapted from CID constructor in js-cids
// cidStr must be a base58btc-encoded CIDv1 string.
// TODO: work for all possible CIDv1 strings? This will entail
//       adding js-cids as a dependency, which previously broke
//       the production build
function parseCid(cidStr) {
  if (cidStr.substring(0, 1) === 'z') { // CID String (encoded with multibase)
    const cid = bs58.decode(cidStr.substring(1))

    // 120 is multicodec code for 'git-raw'
    if (cid[0] !== 1 || cid[1] !== 120) {
      throw new Error(`expecting a v1 CID with a 'git-raw' codec, found:
                      CID version = ${cid[0]}, codec = ${cid[1]}`);
    }

    const multihash = cid.slice(2);
    return { version: 1, codec: 'git-raw', multihash };
  } else {
    throw new Error("can only handle base58btc-encoded CIDs");
  }
}

export function commitCloneHash(commitCid) {
  const parsedCid = parseCid(commitCid);
  const cidMultihash = parsedCid.multihash;

  if (cidMultihash[0] !== 17 || cidMultihash[1] !== 20) {
    throw new Error("expecting a CID with sha1-based multihash");
  }

  const cidMhSansPrefix = cidMultihash.slice(2);
  return cidMhSansPrefix.toString('hex');
}
