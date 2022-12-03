#!/bin/bash
cd ./.docker || (echo 'Missing .docker' && return);

############################################################
# Help                                                     #
############################################################
Help()
{
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
        Traefik=" -f docker-compose-traefik.yml"
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
    cp ../backend/.env .env
    cd ./certs/
    bash cert.sh jira-logger.io
    cd ..
    docker-compose -f docker-compose.yml build
    ;;

  start)
    echo "Running action $Action"
    cp ../backend/.env .env
    cd ./certs/
    bash cert.sh jira-logger.io
    cd ..
    docker-compose -f docker-compose.yml $Traefik up $Background

    case $Mode in
      ng-build-dev)
            docker-compose -f docker-compose.yml $Traefik run $Background node npm run build-dev
        ;;
      ng-build)
            docker-compose -f docker-compose.yml $Traefik run $Background node npm run build
        ;;
      *)
        ;;
    esac
    ;;

  down)
    echo "Running action $Action"
    docker-compose -f docker-compose.yml -f docker-compose-traefik.yml down
    ;;

  ng-build)
        docker-compose -f docker-compose.yml $Traefik run $Background node npm run build
    ;;
  ng-build-dev)
        docker-compose -f docker-compose.yml $Traefik run $Background node npm run build-dev
    ;;

  *)
    Help
    ;;
esac
