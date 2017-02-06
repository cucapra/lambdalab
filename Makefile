.PHONY: web
web:
	npm run build-web

.PHONY: clean
clean:
	rm -rf lambdalab.bundle.js build
