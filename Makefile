.PHONY: web
web: lambdalab.bundle.js

lambdalab.bundle.js: lambdalab.ts $(wildcard lib/*.ts)
	yarn
	yarn run build-web

.PHONY: dist
dist: lambdalab.bundle.js index.html
	mkdir -p $@
	cp $^ $@

.PHONY: cli
cli:
	yarn run build-cli

.PHONY: test
test:
	yarn run test

.PHONY: clean
clean:
	rm -rf lambdalab.bundle.js build dist

.PHONY: deploy
RSYNCARGS := --compress --recursive --checksum --itemize-changes \
	--delete -e ssh --perms --chmod=Du=rwx,Dgo=rx,Fu=rw,Fog=r
DEST := courses:coursewww/capra.cs.cornell.edu/htdocs/lambdalab
deploy: dist
	rsync $(RSYNCARGS) dist/ $(DEST)
