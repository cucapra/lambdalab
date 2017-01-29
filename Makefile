.PHONY: all
all: build/lambdalab.js build/index.html

build/lambdalab.js: lambdalab.ts
	npm run build

build/index.html: index.html
	cp $< $@
