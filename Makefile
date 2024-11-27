ALL=\
	build/package.json \
	lib/express-tee.js \
	esm/express-tee.mjs \

all: $(ALL)

clean:
	/bin/rm -fr $(ALL) lib/*.js test/*.js build/

esm/%.mjs: build/lib/%.js
	mkdir -p esm
	cp $^ $@

build/lib/%.js: lib/%.ts tsconfig-esm.json
	./node_modules/.bin/tsc -p tsconfig-esm.json
	perl -i -pe 's#from "../"#from "../lib/express-tee.js"#' build/test/*.js

lib/%.js: lib/%.ts tsconfig.json
	./node_modules/.bin/tsc -p tsconfig.json

build/package.json: package.json
	mkdir -p build
	echo '{"type": "module"}' > $@

test: all
	./node_modules/.bin/mocha test
	./node_modules/.bin/mocha build/test

.PHONY: all clean test

.PRECIOUS: build/lib/%.js
