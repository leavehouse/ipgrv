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
