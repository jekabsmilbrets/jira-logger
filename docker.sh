#!/bin/bash

############################################################
# Help                                                     #
############################################################
Help()
{
   # Display Help
   echo "Docker compose manager."
   echo
   echo "Syntax: docker.sh -a build"
   echo "Syntax: docker.sh -a start -m watch -b"
   echo "Syntax: docker.sh -a start -b"
   echo "Syntax: docker.sh -a ng-watch"
   echo "Syntax: docker.sh -a stop"
   echo "Syntax: docker.sh -i"
   echo "options:"
   echo "a     set action [start|stop|build|ng-watch|ng-watch-prod|ng-build|ng-build-prod]"
   echo "m     set mode [watch|watch-prod|build|build-prod]"
   echo "i     runs npm ci"
   echo "b     run docker containers in background"
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

############################################################
# Process the input options. Add options as needed.        #
############################################################
# Get the options
while getopts "hibm:a:" options; do
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
      i)
        docker-compose --project-directory=./ -f .docker/docker-compose.yml run jira-logger-node npm ci
        exit;;
      *) # Invalid option
        Help
        exit
        ;;
   esac
done

case $Action in
  build)
    echo "Running action $Action"
    docker-compose --project-directory=./ -f .docker/docker-compose.yml build
    ;;

  start)
    echo "Running action $Action"
    docker-compose --project-directory=./ -f .docker/docker-compose.yml up $Background

    case $Mode in
      watch)
            docker-compose --project-directory=./ -f .docker/docker-compose.yml run $Background jira-logger-node npm run watch
        ;;
      watch-prod)
            docker-compose --project-directory=./ -f .docker/docker-compose.yml run $Background jira-logger-node npm run watch-prod
        ;;
      build)
            docker-compose --project-directory=./ -f .docker/docker-compose.yml run $Background jira-logger-node npm run build-dev
        ;;
      build-prod)
            docker-compose --project-directory=./ -f .docker/docker-compose.yml run $Background jira-logger-node npm run build
        ;;
      *)
        ;;
    esac
    ;;

  stop)
    echo "Running action $Action"
    docker-compose --project-directory=./ -f .docker/docker-compose.yml down
    ;;

  ng-watch)
        docker-compose --project-directory=./ -f .docker/docker-compose.yml run $Background jira-logger-node npm run watch
    ;;
  ng-watch-prod)
        docker-compose --project-directory=./ -f .docker/docker-compose.yml run $Background jira-logger-node npm run watch-prod
    ;;
  ng-build)
        docker-compose --project-directory=./ -f .docker/docker-compose.yml run $Background jira-logger-node npm run build-dev
    ;;
  ng-build-prod)
        docker-compose --project-directory=./ -f .docker/docker-compose.yml run $Background jira-logger-node npm run build
    ;;

  *)
    Help
    ;;
esac
