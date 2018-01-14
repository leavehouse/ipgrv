import multibase from "multibase"
import multicodec from "multicodec"
import multihashes from "multihashes"

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

// directly stolen/adapted from CID constructor in js-cids
function parseCid(cidStr) {
  let version, codec, multihash;
  if (multibase.isEncoded(cidStr)) { // CID String (encoded with multibase)
    const cid = multibase.decode(cidStr)
    version = parseInt(cid.slice(0, 1).toString('hex'), 16)
    codec = multicodec.getCodec(cid.slice(1))
    multihash = multicodec.rmPrefix(cid.slice(1))
  } else { // bs58 string encoded multihash
    codec = 'dag-pb'
    multihash = multihashes.fromB58String(cidStr)
    version = 0
  }
  // TODO: add validation?
  return { version, codec, multihash };
}

export function commitCloneHash(commitCid) {
  const parsedCid = parseCid(commitCid);
  const cidMultihash = parsedCid.multihash;
  const cidMhPrefix = multihashes.prefix(cidMultihash);
  const cidMhSansPrefix = cidMultihash.slice(cidMhPrefix.length);
  return cidMhSansPrefix.toString('hex');
}
