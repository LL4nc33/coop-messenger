MAKEFLAGS := --jobs=1
VERSION := $(shell git describe --tag 2>/dev/null || echo "dev")
COMMIT := $(shell git rev-parse --short HEAD)

.PHONY:

help:
	@echo "Coop Messenger - Build targets:"
	@echo
	@echo "  make build                - Build web app and server binary"
	@echo "  make clean                - Clean build/dist folders"
	@echo
	@echo "Web app:"
	@echo "  make web                  - Build the web app (install deps + build)"
	@echo "  make web-deps             - Install web dependencies (npm install)"
	@echo "  make web-build            - Build the web app"
	@echo
	@echo "Server:"
	@echo "  make cli-linux-server     - Build server binary (Linux, current arch)"
	@echo
	@echo "Test/check:"
	@echo "  make test                 - Run Go tests"
	@echo "  make fmt                  - Run formatters"
	@echo "  make vet                  - Run go vet"
	@echo
	@echo "Dependencies:"
	@echo "  make build-deps-ubuntu    - Install build dependencies on Ubuntu"


# Building everything

clean: .PHONY
	rm -rf dist build server/docs server/site

build: web cli-linux-server


# Ubuntu-specific

build-deps-ubuntu:
	sudo apt-get update
	sudo apt-get install -y \
		curl \
		gcc \
		python3 \
		python3-venv \
		jq
	which pip3 || sudo apt-get install -y python3-pip


# Web app

web: web-deps web-build

web-build:
	# If this fails for .svg files, optimize them with svgo
	cd web \
		&& npm run build \
		&& mv build/index.html build/app.html \
		&& rm -rf ../server/site \
		&& mv build ../server/site \
		&& rm \
			../server/site/config.js

web-deps:
	cd web && npm install

web-deps-update:
	cd web && npm update

web-fmt:
	cd web && npm run format

web-fmt-check:
	cd web && npm run format:check

web-lint:
	cd web && npm run lint


# Server build

cli-linux-server: cli-deps-static-sites
	mkdir -p dist/coop_linux_server server/docs
	CGO_ENABLED=1 go build \
		-o dist/coop_linux_server/coop \
		-tags sqlite_omit_load_extension,osusergo,netgo \
		-ldflags \
		"-linkmode=external -extldflags=-static -s -w -X main.version=$(VERSION) -X main.commit=$(COMMIT) -X main.date=$(shell date +%s)"

cli-deps-static-sites:
	mkdir -p server/docs server/site
	touch server/docs/index.html server/site/app.html


# Test/check targets

test: .PHONY
	go test $(shell go list ./... | grep -vE 'ntfy/(test|examples|tools)')

fmt: .PHONY
	gofmt -s -w .

fmt-check:
	test -z $(shell gofmt -l .)

vet:
	go vet ./...
