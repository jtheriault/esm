import Entry from "../../entry.js"

import _load from "./_load.js"
import moduleState from "../state.js"

function load(id, parent, isMain, preload) {
  let child

  moduleState.parsing = true

  try {
    child = _load(id, parent, isMain)
  } finally {
    moduleState.parsing = false
  }

  if (child.loaded) {
    return _load(id, parent, isMain, preload)
  }

  const entry = Entry.get(child)

  if (entry.state < 3) {
    entry.state = 2
    _load(id, parent, isMain, preload)
  }

  entry.state = 4
  return child
}

export default load
