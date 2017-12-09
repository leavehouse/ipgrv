export const treePathEquals = (path1, path2) => {
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
