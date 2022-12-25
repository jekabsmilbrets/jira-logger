#!/bin/bash

############################################################
# Help                                                     #
############################################################
Help() {
  # Display Help
  echo "Docker compose manager."
  echo
  echo "Syntax: manager.sh -a build"
  echo "Syntax: manager.sh -a start -m ng-build -b"
  echo "Syntax: manager.sh -a start -b -t"
  echo "Syntax: manager.sh -a ng-build"
  echo "Syntax: manager.sh -a down"
  echo "options:"
  echo "a     set action [start|down|build]"
  echo "m     set mode [ng-build|ng-build-dev]"
  echo "b     run docker containers in background"
  echo "t     run with Traefik"
  echo
}

############################################################
############################################################
# Main program                                             #
############################################################
############################################################

# Set variables
Action=""
Mode=""
Background=""
Traefik=""

dockerComposeYML="./.docker/docker-compose.yml"

function copyEnvironment() {
  echo "Copying environment"
  cp ./backend/.env ./.docker/.env
}

function generateCertificates() {
  echo "Generating certificates"
  cd ./.docker/certs/
  bash cert.sh jira-logger.io
  cd ..
  cd ..
}

function ngBuild() {
  ttraefik=${1:-""}
  bbackground=${2:-""}
  buildCmd=${3:-"build"}

  echo "Starting ng-$buildCmd"

  docker-compose -f ./.docker/docker-compose.yml $ttraefik run $bbackground node npm run $buildCmd
}

############################################################
# Process the input options. Add options as needed.        #
############################################################
# Get the options
while getopts "hibtm:a:" options; do
  case "${options}" in
  a)
    Action=${OPTARG}
    ;;
  m)
    Mode=${OPTARG}
    ;;
  b)
    Background=" -d"
    ;;
  t)
    Traefik=" -f ./.docker/docker-compose-traefik.yml"
    ;;
  *) # Invalid option
    Help
    exit
    ;;
  esac
done

case $Action in
build)
  echo "Running action $Action"
  copyEnvironment
  generateCertificates
  docker-compose -f $dockerComposeYML build
  ;;

start)
  echo "Running action $Action"
  copyEnvironment
  generateCertificates
  docker-compose -f $dockerComposeYML $Traefik up $Background

  case $Mode in
  ng-build-dev)
    ngBuild $Traefik $Background build-dev
    ;;
  ng-build)
    ngBuild $Traefik $Background build
    ;;
  *) ;;

  esac
  ;;

down)
  echo "Running action $Action"
  docker-compose -f $dockerComposeYML -f ./.docker/docker-compose-traefik.yml down
  ;;

ng-build)
  ngBuild $Traefik $Background build
  ;;
ng-build-dev)
  ngBuild $Traefik $Background build-dev
  ;;

*)
  Help
  ;;
esac
