.PHONY: web
web:
	npm run build-web

.PHONY: cli
cli:
	npm run build-cli

.PHONY: clean
clean:
	rm -rf lambdalab.bundle.js build
