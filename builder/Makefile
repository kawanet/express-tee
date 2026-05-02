SRC   := $(wildcard ../lib/*.ts)
TYPES := $(wildcard ../types/*.d.ts)
BUILDER_SRC := $(wildcard ./*.ts)

MJS_DST := ../dist/express-tee.mjs
CJS_DST := ../dist/express-tee.cjs

MJS_CONFIG := ./rollup-mjs.config.ts
CJS_CONFIG := ./rollup-cjs.config.ts

# Bundle is around 2 KB today (lib/express-tee.ts only; express-intercept is
# external). If it gets significantly larger, it might indicate an accidental
# inclusion of a Node.js built-in or a transitive dependency.
MAX_BYTES := 5000

# Documentation-specified named exports that must be verified in the bundles.
NAMED_EXPORTS := tee

ALL := $(MJS_DST) $(CJS_DST)

####

# Build all artifacts.
all: $(ALL)

$(MJS_DST): $(MJS_CONFIG) $(SRC) $(BUILDER_SRC)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@test "$$(wc -c < $@)" -le $(MAX_BYTES) || { echo "ERROR: $@ exceeds $(MAX_BYTES) byte cap" >&2; exit 1; }
	@ls -l $@
	@echo ""

$(CJS_DST): $(CJS_CONFIG) $(SRC) $(BUILDER_SRC)
	@mkdir -p $(dir $@)
	../node_modules/.bin/rollup -c $<
	@test "$$(wc -c < $@)" -le $(MAX_BYTES) || { echo "ERROR: $@ exceeds $(MAX_BYTES) byte cap" >&2; exit 1; }
	@ls -l $@
	@echo ""

# Verify the bundles by importing/requiring the package itself.
# This ensures that the public entrypoints (exports/main) are correctly configured.
# Note: process.argv.slice(1) is used because node -e 'code' arg1 arg2
# results in process.argv = ['node', 'arg1', 'arg2'].
smoke: all
	@# MJS smoke test via public entrypoint
	cd .. && node --input-type=module -e 'const m = await import("express-tee"); for (const k of process.argv.slice(1)) { if (typeof m[k] !== "function") { console.error("missing MJS export:", k); process.exit(1); } console.log("MJS export OK:", k); }' $(NAMED_EXPORTS)
	@# CJS smoke test via public entrypoint
	cd .. && node --input-type=commonjs -e 'const m = require("express-tee"); for (const k of process.argv.slice(1)) { if (typeof m[k] !== "function") { console.error("missing CJS export:", k); process.exit(1); } console.log("CJS export OK:", k); }' $(NAMED_EXPORTS)

####

# Build, run smoke tests, and conditionally run full tests (tsc and node:test).
# 1. Skip on Node.js 20 (already EOL).
# 2. Skip during 'npm install' (npm_command=install) to prevent redundant tests in CI and local dev.
# Informative messages are shown when skipping.
test: all smoke $(TYPES)
	@node -v | grep -qv "^v20" || echo "Node 20 detected: skipping full tests."
	@ [ "$$npm_command" != "install" ] || echo "npm install detected: skipping full tests."
	@node -v | grep -q "^v20" || [ "$$npm_command" = "install" ] || $(MAKE) test-ts

# Actual test commands requiring Node.js 22+.
# Note: each test topic registers its own before/after cleanup hook against
# its os.tmpdir() cache prefix (see test/lib/util.ts), so no Makefile-level
# tmp purge is needed.
test-ts:
	../node_modules/.bin/tsc --noEmit
	cd .. && node --test test/*.test.ts

clean:
	/bin/rm -fr $(ALL)

.PHONY: all clean test smoke test-ts
