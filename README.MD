# JIRA-LOGGER

This is an JIRA time logger software for easy time logging.
Project contains of API and Angular PWA;

## Running docker mode

To run in docker mode you have to have docker and docker-compose installed;

## Setup

1) run command "sh manager.sh -a build -m ng-build"

## Basic Usage

1) To run with **console output** run command "sh manager.sh -a **start**"
2) To run in **background** run command "sh manager.sh -a start **-b**"
3) To run with **Traefik** run command "sh manager.sh -a start -b **-t**"
4) To rebuild Angular run command "sh manager.sh **-m ng-build**" and rerun start command

After first start Certificate will be generated at **.docker/nginx-selfsigned.crt**, 
which should be imported in to root certificates in your system to allow SSL to be used for 
API calls and Angular PWA; 


## Project Specification

### API
* Symfony 6.1
* Doctrine
* PostgreSQL
* PHP 8.1 / PHP-FPM
* Nginx

### FE
* Angular 14
* Material 14
* Node 16.16.0
* NPM 8.11.0
