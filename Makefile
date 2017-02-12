.PHONY: web
web:
	yarn run build-web

.PHONY: cli
cli:
	yarn run build-cli

.PHONY: test
test:
	yarn run test

.PHONY: clean
clean:
	rm -rf lambdalab.bundle.js build
