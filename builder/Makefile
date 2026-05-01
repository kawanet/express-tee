SRC := $(wildcard ../lib/*.ts ../types/*.ts)
BUILDER_SRC := $(wildcard ./*.ts)

PKG_DST := ../dist/package.json
MJS_DST := ../dist/express-tee.mjs
CJS_DST := ../dist/express-tee.cjs

MJS_CONFIG := ./rollup-mjs.config.ts
CJS_CONFIG := ./rollup-cjs.config.ts

# Bundle is around 2 KB today (lib/express-tee.ts only; express-intercept is
# external). Anything noticeably larger means an accidental bundling of a
# Node built-in or a transitive dep — fail the build so it cannot slip in.
MAX_BYTES := 5000

# Every named export the package documents must survive the round trip
# through both CJS and ESM bundles. List them once and assert in both
# smoke checks below.
NAMED_EXPORTS := tee

ALL := $(MJS_DST) $(CJS_DST) $(PKG_DST)

####

all: $(ALL)

$(PKG_DST):
	@mkdir -p $(dir $@)
	echo '{"type":"commonjs"}' > $@
	@ls -l $@
	@echo ""

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

####

# Build, type-check, smoke-check that both bundles expose every named
# export, and run the node:test suite against the source.
# Clean test/tmp before each run since the tee middleware writes files there.
test: all
	../node_modules/.bin/tsc --noEmit
	cd .. && node -e 'const m = require("./dist/express-tee.cjs"); for (const k of "$(NAMED_EXPORTS)".split(" ")) if (typeof m[k] !== "function") { console.error("missing CJS export:", k); process.exit(1); } console.log("CJS smoke OK")'
	cd .. && node --input-type=module -e 'const m = await import("./dist/express-tee.mjs"); for (const k of "$(NAMED_EXPORTS)".split(" ")) if (typeof m[k] !== "function") { console.error("missing MJS export:", k); process.exit(1); } console.log("MJS smoke OK")'
	cd .. && /bin/rm -fr test/tmp && node --test test/*.test.ts

clean:
	/bin/rm -fr $(ALL)

.PHONY: all clean test
