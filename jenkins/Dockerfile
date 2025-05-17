FROM jenkins/jenkins:lts

USER root

RUN apt-get update && apt-get install -y docker.io curl gnupg \
  && curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
  && chmod +x /usr/local/bin/docker-compose \
  && usermod -aG docker jenkins

USER jenkins
