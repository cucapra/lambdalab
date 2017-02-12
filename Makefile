.PHONY: web
web:
	yarn run build-web

.PHONY: cli
cli:
	yarn run build-cli

.PHONY: clean
clean:
	rm -rf lambdalab.bundle.js build
