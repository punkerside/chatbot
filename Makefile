export SERVICE            = chatbot
export AWS_DEFAULT_REGION = us-east-1
export DOCKER_UID         = $(shell id -u)
export DOCKER_GID         = $(shell id -g)
export DOCKER_USER        = $(shell whoami)
export DOCKER_BUILDKIT    = 0

init:
	@cd terraform/ && terraform init

apply:
	@cd terraform/ && terraform apply -var="service=${SERVICE}"

install:
	@echo "${DOCKER_USER}:x:${DOCKER_UID}:${DOCKER_GID}::/app:/sbin/nologin" > passwd
	@docker run --rm -u ${DOCKER_UID}:${DOCKER_GID} -v ${PWD}/passwd:/etc/passwd:ro -v ${PWD}/ui:/app -w /app node:22 npm install

up:
	@docker compose up

down:
	@docker compose down