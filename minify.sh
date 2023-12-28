#! /usr/bin/env bash
# Minify files from dist folder
# Dependencies: rollup & terser (--global)
green='\033[33m'
clear='\033[0m'

echo
echo -e "${green}[*] Minifying relevant files${clear}"

# SOCKET
terser dist/socket.js -c -m --keep-classnames -o dist/socket.min.js #iife
terser dist/socket.esm.js -c -m --keep-classnames -o dist/socket.esm.min.js --module --ecma 2015
terser dist/socket.umd.js -c -m --keep-classnames -o dist/socket.umd.min.js

# PARSER
#terser dist/parser.js -c -m --keep-classnames -o dist/parser.min.js #iife
#terser dist/parser.mjs -c -m --keep-classnames -o dist/parser.min.mjs --module --ecma 2015 
#terser dist/parser.umd.js -c -m --keep-classnames -o dist/parser.umd.min.js 
echo -e "${green}[*] Complete${clear}"
echo