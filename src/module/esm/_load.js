import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"

import _load from "../_load.js"
import { dirname } from "path"
import extname from "../../path/extname.js"
import getQueryHash from "../../util/get-query-hash.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import isError from "../../util/is-error.js"
import loader from "./loader.js"
import moduleResolveFilename from "../cjs/resolve-filename.js"
import moduleState from "../state.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"
import toOptInError from "../../util/to-opt-in-error.js"

function load(id, parent, isMain, preload) {
  const parentPkgInfo = PkgInfo.from(parent)
  const parentOptions = parentPkgInfo && parentPkgInfo.options

  let filePath

  if (Module._resolveFilename !== moduleResolveFilename &&
      parentOptions && parentOptions.cjs.paths) {
    filePath = Module._resolveFilename(id, parent, isMain)
  } else {
    filePath = resolveFilename(id, parent, isMain)
  }

  const fromPath = dirname(filePath)
  const pkgInfo = PkgInfo.get(fromPath)
  const pkgOptions = pkgInfo && pkgInfo.options
  const isUnexposed = ! (pkgOptions && pkgOptions.cjs.cache)

  let childIsMain = isMain
  let state = Module

  if (isUnexposed) {
    const ext = extname(filePath)
    childIsMain = false

    if (ext === ".mjs" ||
        (pkgOptions && pkgOptions.gz &&
         ext === ".mjs.gz")) {
      state = moduleState
    }
  }

  const queryHash = getQueryHash(id)
  const cacheKey = filePath + queryHash

  let child
  let error

  let called = false
  let threw = true

  try {
    child = _load(cacheKey, parent, childIsMain, state, function () {
      called = true
      const child = this
      const url = getURLFromFilePath(filePath) + queryHash

      if (isMain) {
        moduleState.mainModule = child
        child.id = "."
      }

      if (isUnexposed) {
        child.parent = void 0
      }

      return loader.call(child, filePath, fromPath, url, parentOptions, preload)
    })

    if (! called &&
        preload) {
      called = true
      preload(child)
    }

    threw = false
  } catch (e) {
    error = e
  }

  if (! threw) {
    return child
  } else if (isError(error) &&
      error.code === "ERR_REQUIRE_ESM") {
    toOptInError(error)
  }

  try {
    throw error
  } finally {
    if (state === Module) {
      delete state._cache[cacheKey]
    } else {
      // Unlike CJS, ESM errors are preserved for subsequent loads.
      setGetter(state._cache, cacheKey, () => {
        throw error
      })
    }
  }
}

export default load
