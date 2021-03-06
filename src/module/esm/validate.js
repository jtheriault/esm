import Entry from "../../entry.js"
import NullObject from "../../null-object.js"

import _loadESM from "./_load.js"
import builtinModules from "../../builtin-modules.js"
import errors from "../../errors.js"

function validate(entry) {
  const children = new NullObject
  const data = entry.data.compile
  const mod = entry.module

  const { exportSpecifiers, moduleSpecifiers } = data
  const { namedExports } = entry.options.cjs

  // Parse children.
  for (const name in moduleSpecifiers) {
    if (! (name in builtinModules)) {
      const child = _loadESM(name, mod)
      const childEntry = Entry.get(child)

      childEntry.state = 2
      children[name] = childEntry
    }
  }

  // Validate requested child export names.
  for (const name in children) {
    const childEntry = children[name]
    const requestedExportNames = moduleSpecifiers[name]

    if (! childEntry.esm) {
      if (! namedExports &&
          requestedExportNames.length &&
          (requestedExportNames.length > 1 ||
           requestedExportNames[0] !== "default")) {
        throw new errors.SyntaxError("ERR_EXPORT_MISSING", childEntry.module, requestedExportNames[0])
      }

      continue
    }

    const childData = childEntry.data.compile

    for (const requestedName of requestedExportNames) {
      const { exportSpecifiers:childExportSpecifiers } = childData

      if (requestedName in childExportSpecifiers) {
        if (childExportSpecifiers[requestedName] < 3) {
          continue
        }

        throw new errors.SyntaxError("ERR_EXPORT_STAR_CONFLICT", mod, requestedName)
      }

      const { exportStarNames:childExportStarNames } = childData
      let throwExportMissing = true

      for (const childStarName of childExportStarNames) {
        if (! (childStarName in children)) {
          throwExportMissing = false
          break
        }
      }

      if (throwExportMissing) {
        throw new errors.SyntaxError("ERR_EXPORT_MISSING", childEntry.module, requestedName)
      }
    }
  }

  // Resolve export names from star exports.
  for (const starName of data.exportStarNames) {
    if (! (starName in children)) {
      continue
    }

    const childEntry = children[starName]

    if (! childEntry.esm) {
      continue
    }

    const childData = childEntry.data.compile

    for (const exportName in childData.exportSpecifiers) {
      if (exportName in exportSpecifiers) {
        if (exportSpecifiers[exportName] === 2) {
          // Export specifier is conflicted.
          exportSpecifiers[exportName] = 3
        }
      } else {
        // Export specifier is imported.
        exportSpecifiers[exportName] = 2
      }
    }
  }
}

export default validate
